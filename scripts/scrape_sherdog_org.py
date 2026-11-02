"""Collect an organization's history from Sherdog's event pages: Jungle Fight and Invicta FC.

Sherdog lists every event of an organization with its whole card: both fighters, the winner, the weight class, the title
flag, the method, the referee, the round and the time (marked up with schema.org, so the pages are easy to read).

The list of events is Sherdog's own sitemap (sitemap-events*.xml, which robots.txt allows). An event belongs to an
organization when the name in its URL starts with the organization's prefix AND the organization named on the page is the
one expected, so another promoter's "Invicta..." or "Jungle..." event is never taken for it. Requests are spaced out and
identify this project.

What Sherdog's event pages do NOT give, and what this script therefore leaves empty rather than guess:
- a fighter's country, age, height, reach or gym (they are on the fighter's own page, which is not read here);
- a fighter's career record: the record shown on the page is only the main event's, so the site counts the record from
  the bouts it has;
- whether a fighter is still active: `status` is "active" when the fighter fought in the last two years, a rule of this
  script, not Sherdog's;
- rankings or the list of champions: rankings.csv holds only its header (a title bout is flagged on the bout itself);
- the gender of a division: Sherdog calls the women's strawweight just "Strawweight", and so does this data.

KSW and RIZIN are a different case: ESPN covers them up to the end of 2024 (scripts/scrape_espn_org.py) and Sherdog has the
events after that, so for them this script only ADDS the events from `since` on to the files ESPN wrote and never touches an
ESPN row: fighters keep the spelling and profile ESPN gave them, an event the files already have is skipped, and a second run
replaces only what an earlier run added (its event slug has "-sherdog-" in it). Name matching is exact (accents and case
ignored); names that look alike but are not equal are listed for review, never merged.

Output (data/raw/<org>/), the same three files every non-UFC organization has (see backend/app/services/org_service.py):
    fights.csv, fighters.csv, rankings.csv

Usage (from the repo root):
    python -m scripts.scrape_sherdog_org jungle-fight --dry-run --cache-dir .sherdog-cache
    python -m scripts.scrape_sherdog_org all --cache-dir .sherdog-cache        # Jungle Fight and Invicta FC
    python -m scripts.scrape_sherdog_org ksw --cache-dir .sherdog-cache        # add KSW from 2025 on to the ESPN files
    python -m scripts.scrape_sherdog_org rizin --cache-dir .sherdog-cache      # add RIZIN from 2025 on to the ESPN files
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import date, timedelta
from difflib import SequenceMatcher
from pathlib import Path

from bs4 import BeautifulSoup

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.scrape_espn import ascii_name, load_csv, map_weight_class, name_key, save_csv
from scripts.scrape_oktagon import Fetcher
from scripts.scrape_pfl import FIGHT_FIELDS, FIGHTER_FIELDS, RANKING_FIELDS, normalize_method
from src.ufc_predictor.config import RAW_DATA_DIR

BASE_URL = "https://www.sherdog.com"
SITEMAPS = [f"{BASE_URL}/sitemap-events.xml"] + [f"{BASE_URL}/sitemap-events{number}.xml" for number in (2, 3, 4)]
USER_AGENT = "FightIntelligenceBot/1.0 (+https://github.com/larissapavan; personal stats project; reads public Sherdog pages)"
REQUEST_DELAY_SECONDS = 1.0
ACTIVE_WITHIN_DAYS = 730
DECISIONS = {"U-DEC", "S-DEC", "M-DEC", "DEC"}


@dataclass(frozen=True)
class SherdogOrg:
    id: str  # the organization id: data/raw/<id>, the URL prefix and the event slug prefix
    prefixes: tuple[str, ...]  # what the event's address starts with on Sherdog ("Jungle-Fight-156-...")
    name: str  # the organization as the event page names it
    womens: bool = False  # an all-women's promotion: Sherdog's "Bantamweight" there is the women's division
    # Set for an organization whose earlier years come from another source: only events from this day on are added to the
    # files that source wrote, instead of the files being built from Sherdog alone.
    since: date | None = None


ORGS: dict[str, SherdogOrg] = {
    "jungle-fight": SherdogOrg("jungle-fight", ("Jungle-Fight",), "Jungle Fight"),
    "invicta": SherdogOrg("invicta", ("Invicta",), "Invicta Fighting Championships", womens=True),
    # ESPN has both up to the end of 2024 (KSW 101 on 2024-12-20, Rizin 49 on 2024-12-31); Sherdog has what came after.
    "ksw": SherdogOrg("ksw", ("KSW-", "Konfrontacja"), "Konfrontacja Sztuk Walki", since=date(2025, 1, 1)),
    "rizin": SherdogOrg("rizin", ("Rizin-", "RIZIN"), "Rizin Fighting Federation", since=date(2025, 1, 1)),
}
# What `all` runs: the organizations built from Sherdog alone. The others add to files another source wrote, so they run by name.
STANDALONE = [org_id for org_id, org in ORGS.items() if org.since is None]
# People the files already have under another spelling, confirmed by hand (Sherdog's spelling -> the one already in the files).
# Only equal names are merged by the script; a name that merely looks alike is listed for review until it is added here.
SAME_PERSON: dict[str, dict[str, str]] = {
    "ksw": {"Oleksii Polishchuk": "Oleksii Polischuck", "Patryk Surdyn": "Patrick Surdyn"},
    "rizin": {"Kyung Pyo Kim": "KyeungPyo Kim"},
}
# Sherdog does not say which sex a bout is, and these division names exist for both.
AMBIGUOUS_DIVISIONS = {"Atomweight", "Strawweight", "Flyweight", "Bantamweight", "Featherweight", "Lightweight"}


# --------------------------------------------------------------------------- listing


def event_urls(sitemap_xml: str, prefix: str) -> list[str]:
    """The event pages of a sitemap whose name starts with the prefix, in the order the sitemap lists them."""
    found = re.findall(r"<loc>(" + re.escape(BASE_URL) + r"/events/" + re.escape(prefix) + r"[^<]*)</loc>", sitemap_xml)
    return list(dict.fromkeys(found))


# --------------------------------------------------------------------------- parsing


def clean(text: str | None) -> str:
    return " ".join((text or "").split())


def fighter_of(node) -> dict | None:
    """{name, url, nickname, result} of a fighter block (the main event's or a row of the results table)."""
    link = node.select_one('a[href^="/fighter/"]')
    name = clean(node.select_one('[itemprop="name"]').get_text(" ")) if node.select_one('[itemprop="name"]') else ""
    if not link or not name:
        return None
    nickname = re.search(r"'([^']+)'", (node.select_one("img") or {}).get("alt", "") or "")
    result = node.select_one(".final_result")
    return {
        "name": ascii_name(name),
        "url": BASE_URL + link["href"],
        "nickname": ascii_name(nickname.group(1)) if nickname else "",
        "result": clean(result.get_text()).lower() if result else "",
    }


def method_of(text: str) -> tuple[str, str]:
    """Sherdog's method ("Submission (Rear-Naked Choke)", "Decision (Unanimous)") -> (code, detail) in the UFC data's vocabulary."""
    code, detail, _, _ = normalize_method(clean(text))
    if code == "DEC":  # "Decision (Split)": normalize_method keeps the parenthesis as a detail; it says which decision
        code = {"unanimous": "U-DEC", "split": "S-DEC", "majority": "M-DEC"}.get(detail.lower(), "DEC")
    if code in DECISIONS:  # not a technique
        detail = ""
    return code, detail


def division(label: str, womens: bool) -> str:
    """Sherdog's weight class -> the UFC data's name: any catchweight ("150lb Catchweight") is "Catch Weight"."""
    if re.search(r"catch", label, re.IGNORECASE):
        return "Catch Weight"
    name = map_weight_class(label)
    return f"Women's {name}" if womens and name and not name.startswith("Women") and name != "Open Weight" else name


def build_bout(left: dict, right: dict, *, weight: str, title: bool, method: str, round_text: str, time_text: str, womens: bool = False) -> dict:
    """One bout with its outcome. A side that is marked "win" wins; "draw" and "nc" mark a draw and a no contest."""
    results = {left["result"], right["result"]}
    winner = left["name"] if left["result"] == "win" else right["name"] if right["result"] == "win" else ""
    outcome = "win" if winner else "draw" if "draw" in results else "no_contest" if "nc" in results else ""
    code, detail = method_of(method) if outcome else ("", "")
    if outcome == "draw":
        code, detail = "Draw", ""
    elif outcome == "no_contest":
        code, detail = "NO CONTEST", ""
    return {
        "fighter_1": left, "fighter_2": right, "winner": winner, "outcome": outcome, "method": code, "method_detail": detail,
        "round": round_text if outcome and round_text.isdigit() else "", "time": time_text if outcome else "",
        "weight_class": division(weight, womens), "title_fight": title,
    }


def parse_event(html: str, url: str, org: SherdogOrg) -> dict | None:
    """One event with its bouts (main event first), or None when the page is not an event of that organization."""
    soup = BeautifulSoup(html, "html.parser")
    detail = soup.select_one(".event_detail")
    if not detail:
        return None
    organization = clean((detail.select_one(".organization") or soup.new_tag("x")).get_text())
    start = detail.select_one('meta[itemprop="startDate"]')
    title = detail.select_one("h1")
    if organization != org.name or not start or not title:
        return None
    bouts = []

    main = soup.select_one(".fight_card")
    if main and main.select_one(".left_side") and main.select_one(".right_side"):
        left, right = fighter_of(main.select_one(".left_side")), fighter_of(main.select_one(".right_side"))
        if left and right:
            versus = main.select_one(".versus")
            resume = {}
            for cell in soup.select("table.fight_card_resume td"):  # <td><em>Method</em><br>TKO (Punches)</td>
                label = cell.select_one("em")
                if label:
                    resume[clean(label.get_text()).lower()] = clean(cell.get_text(" ")).removeprefix(clean(label.get_text())).strip()
            bouts.append(
                build_bout(
                    left, right, weight=clean((versus.select_one(".weight_class") or soup.new_tag("x")).get_text()), title=bool(versus.select_one(".title_fight")),
                    method=resume.get("method", ""), round_text=resume.get("round", ""), time_text=resume.get("time", ""), womens=org.womens,
                )
            )

    table = soup.select_one("table.new_table.result")
    for row in (table.select("tr") if table else []):
        cells = row.find_all("td", recursive=False)
        if len(cells) < 7:
            continue
        left, right = fighter_of(cells[1]), fighter_of(cells[3])
        if not (left and right):
            continue
        bouts.append(
            build_bout(
                left, right, weight=clean((cells[2].select_one(".weight_class") or soup.new_tag("x")).get_text()), title=bool(cells[2].select_one(".title_fight")),
                method=clean((cells[4].select_one("b") or soup.new_tag("x")).get_text()), round_text=clean(cells[5].get_text()), time_text=clean(cells[6].get_text()),
                womens=org.womens,
            )
        )
    if not bouts:
        return None
    location = detail.select_one('[itemprop="location"]')
    return {
        "url": url,
        "id": url.rsplit("-", 1)[-1],
        "name": ascii_name(clean(title.get_text())),
        "day": date.fromisoformat(start["content"][:10]),
        "location": ascii_name(clean(location.get_text())) if location else "",
        "bouts": bouts,
    }


# --------------------------------------------------------------------------- assembling


def slug_prefix(org: SherdogOrg) -> str:
    """The event slug prefix: "invicta-<id>", but "ksw-sherdog-<id>" where ESPN's "ksw-<id>" events are already in the file."""
    return f"{org.id}-sherdog" if org.since else org.id


def fight_rows(events: list[dict], org: SherdogOrg) -> list[dict]:
    rows = []
    for event in events:
        for order, bout in enumerate(event["bouts"]):
            one, two = bout["fighter_1"], bout["fighter_2"]
            title = bout["title_fight"]
            rows.append(
                {
                    "event_name": event["name"], "event_date": event["day"].isoformat(), "location": event["location"],
                    "event_url": event["url"], "event_slug": f"{slug_prefix(org)}-{event['id']}", "circuit": "",
                    "fight_url": f"{event['url']}#fight-{order}", "card_order": order, "fighter_1": one["name"], "fighter_2": two["name"],
                    "fighter_1_url": one["url"], "fighter_2_url": two["url"], "winner": bout["winner"], "outcome": bout["outcome"],
                    "weight_class": bout["weight_class"], "stage": "Title Fight" if title else "", "title_fight": "true" if title else "",
                    "method": bout["method"], "method_detail": bout["method_detail"], "round": bout["round"], "time": bout["time"],
                }
            )
    return rows


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", ascii_name(name).lower()).strip("-")


def fighter_rows(events: list[dict], fights: list[dict], today: date) -> list[dict]:
    """One row per fighter: name, Sherdog profile, nickname, usual division and the dates of the bouts fought here."""
    people: dict[str, dict] = {}
    divisions: dict[str, Counter] = {}
    for event in events:  # newest first: the first nickname seen is the latest
        for bout in event["bouts"]:
            for side in ("fighter_1", "fighter_2"):
                person = bout[side]
                known = people.setdefault(person["url"], dict(person))
                known["nickname"] = known["nickname"] or person["nickname"]
                if bout["weight_class"]:
                    divisions.setdefault(person["url"], Counter())[bout["weight_class"]] += 1
    days: dict[str, list[str]] = {}
    for fight in fights:
        if not fight["outcome"]:  # a bout still to come is not a fight the fighter has had
            continue
        for side in ("fighter_1", "fighter_2"):
            days.setdefault(name_key(fight[side]), []).append(fight["event_date"])
    cutoff = (today - timedelta(days=ACTIVE_WITHIN_DAYS)).isoformat()
    taken: set[str] = set()
    rows = []
    for url, person in sorted(people.items(), key=lambda item: item[1]["name"].lower()):
        slug = slugify(person["name"])
        slug = slug if slug not in taken else f"{slug}-{url.rsplit('-', 1)[-1]}"
        taken.add(slug)
        own = sorted(days.get(name_key(person["name"]), []))
        usual = divisions.get(url)
        rows.append(
            {
                "name": person["name"], "slug": slug, "profile_url": url, "circuit": "", "nickname": person["nickname"],
                "status": "active" if own and own[-1] >= cutoff else "inactive", "career_record": "", "org_record": "",
                "wins": "", "losses": "", "draws": "", "no_contests": "", "age": "", "height_cm": "", "weight_lbs": "", "reach_cm": "",
                "leg_reach_cm": "", "hometown": "", "country": "", "country_code": "", "fighting_out_of": "", "camp": "",
                "weight_class": usual.most_common(1)[0][0] if usual else "", "headshot_url": "", "image_url": "",
                "first_fight_date": own[0] if own else "", "last_fight_date": own[-1] if own else "", "checked": today.isoformat(),
            }
        )
    return rows


def womens_names(fights: list[dict]) -> set[str]:
    """People the file already has in a women's bout: Sherdog does not say which sex a "Bantamweight" bout is."""
    found: set[str] = set()
    for row in fights:
        if row["weight_class"].startswith("Women's"):
            found.update((name_key(row["fighter_1"]), name_key(row["fighter_2"])))
    return found


def overlaps(row_pairs: dict[str, set[frozenset]], event: dict) -> bool:
    """Whether an event the file already has (a day apart at most) holds one of this event's bouts: the same card twice."""
    pairs = {frozenset((name_key(b["fighter_1"]["name"]), name_key(b["fighter_2"]["name"]))) for b in event["bouts"]}
    for offset in (-1, 0, 1):
        if pairs & row_pairs.get((event["day"] + timedelta(days=offset)).isoformat(), set()):
            return True
    return False


def supplement(org: SherdogOrg, events: list[dict], fights: list[dict], fighters: list[dict], today: date) -> tuple[list[dict], list[dict], dict]:
    """The files another source wrote plus this organization's events from `org.since` on.

    Nothing of the other source's is changed except two facts that the new bouts make stale, and only for a fighter who is on
    a new card: the first/last fight date, and `status` (marked inactive and fought within two years: marked active, never
    the other way round).
    Rows an earlier run of this script added are replaced, so a second run gives the same files."""
    marker = f"{org.id}-sherdog-"
    base_fights = [row for row in fights if not row["event_slug"].startswith(marker)]
    base_fighters = [row for row in fighters if not row["profile_url"].startswith(BASE_URL)]
    known = {name_key(row["name"]): row for row in base_fighters}
    aliases = {name_key(sherdog): name_key(espn) for sherdog, espn in SAME_PERSON.get(org.id, {}).items() if name_key(espn) in known}
    report: dict = {"skipped_overlap": [], "possible_same": [], "womens_unresolved": 0, "womens_fixed": 0}

    pairs_by_day: dict[str, set[frozenset]] = {}
    for row in base_fights:
        pairs_by_day.setdefault(row["event_date"], set()).add(frozenset((name_key(row["fighter_1"]), name_key(row["fighter_2"]))))
    fresh = [event for event in events if event["day"] >= org.since]
    kept = []
    for event in fresh:
        if overlaps(pairs_by_day, event):
            report["skipped_overlap"].append(f"{event['day']} {event['name']}")
        else:
            kept.append(event)

    new_fights = fight_rows(kept, org)
    women = womens_names(base_fights)
    # A division the file only knows as a women's one (KSW's Strawweight and Flyweight: nine and ten "Women's" bouts, no men's)
    # is a women's division for the new bouts too, even between two fighters the file has not seen.
    labelled = Counter(row["weight_class"] for row in base_fights)
    womens_only = {name for name in AMBIGUOUS_DIVISIONS if labelled[f"Women's {name}"] and not labelled[name]}
    for row in new_fights:
        for side in ("fighter_1", "fighter_2"):
            existing = known.get(aliases.get(name_key(row[side]), name_key(row[side])))
            if existing:  # the spelling and the profile ESPN already gave this person
                if row["winner"] == row[side]:
                    row["winner"] = existing["name"]
                row[side], row[f"{side}_url"] = existing["name"], existing["profile_url"]
        division = row["weight_class"]
        if division in AMBIGUOUS_DIVISIONS:
            if division in womens_only or name_key(row["fighter_1"]) in women or name_key(row["fighter_2"]) in women:
                row["weight_class"] = f"Women's {division}"
                report["womens_fixed"] += 1
            else:
                report["womens_unresolved"] += 1

    new_people = [row for row in fighter_rows(kept, new_fights, today) if name_key(row["name"]) not in known and name_key(row["name"]) not in aliases]
    for person in new_people:  # a name that is not equal to one ESPN has but looks like it: for a human to look at
        close = max(((SequenceMatcher(None, name_key(person["name"]), key).ratio(), row["name"]) for key, row in known.items()), default=(0, ""))
        if close[0] >= 0.88:
            report["possible_same"].append(f"{person['name']} ~ {close[1]}")

    combined = [*new_fights, *base_fights]
    combined.sort(key=lambda row: row["event_date"], reverse=True)  # stable: each card keeps its order
    dates: dict[str, list[str]] = {}
    for row in combined:
        if row["outcome"]:
            for side in ("fighter_1", "fighter_2"):
                dates.setdefault(name_key(row[side]), []).append(row["event_date"])
    cutoff = (today - timedelta(days=ACTIVE_WITHIN_DAYS)).isoformat()
    on_new_cards = {name_key(row[side]) for row in new_fights for side in ("fighter_1", "fighter_2")}
    updated = []
    for row in base_fighters:
        own = sorted(dates.get(name_key(row["name"]), []))
        row = dict(row)
        if own and name_key(row["name"]) in on_new_cards:  # only a fighter with a new bout has anything to update
            row["first_fight_date"], row["last_fight_date"] = own[0], own[-1]
            if row["status"] == "inactive" and own[-1] >= cutoff:
                row["status"] = "active"
        updated.append(row)
    all_fighters = sorted([*updated, *new_people], key=lambda row: row["name"].lower())
    report.update(events=kept, new_bouts=len(new_fights), new_people=len(new_people))
    return combined, all_fighters, report


# --------------------------------------------------------------------------- main


def collect(org: SherdogOrg, fetcher: Fetcher, sitemaps: list[str], *, dry_run: bool) -> int:
    urls: list[str] = []
    for xml in sitemaps:
        for prefix in org.prefixes:
            urls += event_urls(xml, prefix)
    urls = list(dict.fromkeys(urls))
    print(f"[info] {org.id}: {len(urls)} candidate events in the sitemap")
    events: list[dict] = []
    skipped: list[str] = []
    for position, url in enumerate(urls, 1):
        html = fetcher.get(url)
        event = parse_event(html, url, org) if html else None
        if event:
            events.append(event)
        else:
            skipped.append(url.rsplit("/", 1)[-1])
        if position % 50 == 0:
            print(f"[info] {org.id}: {position}/{len(urls)} pages read")
    events.sort(key=lambda event: (event["day"], event["id"]), reverse=True)
    print(f"[info] {org.id}: {len(events)} events; {len(skipped)} skipped as not this organization's or without a card (first: {skipped[:4]})")
    if not events:
        print(f"[error] {org.id}: no events; files left untouched")
        return 1

    if org.since:
        return collect_supplement(org, events, dry_run=dry_run)

    fights = fight_rows(events, org)
    rows = fighter_rows(events, fights, date.today())
    methods = Counter(fight["method"] for fight in fights if fight["outcome"] == "win")
    print(f"[info] {org.id}: {len(fights)} bouts, {len(rows)} fighters, {sum(1 for f in fights if f['title_fight'])} title bouts, {sum(1 for f in fights if not f['outcome'])} without a result")
    print(f"[info] {org.id}: methods of the won bouts: {dict(methods)}")
    print(f"[info] {org.id}: dates {min(e['day'] for e in events)} to {max(e['day'] for e in events)}; no division on {sum(1 for f in fights if not f['weight_class'])} bouts")
    if dry_run:
        print(f"[dry-run] {org.id}: nothing written")
        return 0
    output = RAW_DATA_DIR / org.id
    output.mkdir(parents=True, exist_ok=True)
    save_csv(output / "fights.csv", FIGHT_FIELDS, fights)
    save_csv(output / "fighters.csv", FIGHTER_FIELDS, rows)
    save_csv(output / "rankings.csv", RANKING_FIELDS, [])
    return 0


def collect_supplement(org: SherdogOrg, events: list[dict], *, dry_run: bool) -> int:
    """Add the events from org.since on to the files another source wrote (see supplement)."""
    folder = RAW_DATA_DIR / org.id
    if not (folder / "fights.csv").exists() or not (folder / "fighters.csv").exists():
        print(f"[error] {org.id}: {folder} has no files to add to (this organization is built from another source first); nothing done")
        return 1
    _, fights = load_csv(folder / "fights.csv")
    _, fighters = load_csv(folder / "fighters.csv")
    combined, people, report = supplement(org, events, fights, fighters, date.today())
    added = report["events"]
    if not added:
        print(f"[error] {org.id}: no event from {org.since} on; files left untouched")
        return 1
    print(f"[info] {org.id}: {len(added)} events from {org.since} on ({min(e['day'] for e in added)} to {max(e['day'] for e in added)}), {report['new_bouts']} bouts, {report['new_people']} fighters ESPN did not have")
    print(f"[info] {org.id}: {sum(1 for e in added for b in e['bouts'] if not b['outcome'])} bouts still to come, {sum(1 for e in added for b in e['bouts'] if b['title_fight'])} title bouts")
    print(f"[info] {org.id}: {report['womens_fixed']} bouts marked as women's (a women's-only division here, or a woman the files already have); {report['womens_unresolved']} bouts in a division name both sexes use are left as Sherdog writes it (nearly all men's)")
    if report["skipped_overlap"]:
        print(f"[info] {org.id}: {len(report['skipped_overlap'])} events skipped, the files already have them: {report['skipped_overlap'][:4]}")
    if report["possible_same"]:
        print(f"[review] {org.id}: new names that look like names the files already have (not merged): {report['possible_same'][:12]}")
    print(f"[info] {org.id}: files now {len(combined)} bouts and {len(people)} fighters (before: {len(fights)} and {len(fighters)})")
    if dry_run:
        print(f"[dry-run] {org.id}: nothing written")
        return 0
    save_csv(folder / "fights.csv", FIGHT_FIELDS, combined)
    save_csv(folder / "fighters.csv", FIGHTER_FIELDS, people)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("org", choices=[*ORGS, "all"])
    parser.add_argument("--dry-run", action="store_true", help="read and report, write nothing")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY_SECONDS)
    parser.add_argument("--cache-dir", type=Path, help="keep every page here so an interrupted run resumes")
    args = parser.parse_args(argv)

    fetcher = Fetcher(args.delay, args.cache_dir, user_agent=USER_AGENT)
    sitemaps = [text for text in (fetcher.get(url) for url in SITEMAPS) if text]
    if not sitemaps:
        print("[error] Sherdog's sitemaps could not be read; files left untouched")
        return 1
    status = 0
    for org in [ORGS[org_id] for org_id in STANDALONE] if args.org == "all" else [ORGS[args.org]]:
        status |= collect(org, fetcher, sitemaps, dry_run=args.dry_run)
    return status


if __name__ == "__main__":
    sys.exit(main())
