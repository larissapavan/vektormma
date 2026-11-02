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

Output (data/raw/<org>/), the same three files every non-UFC organization has (see backend/app/services/org_service.py):
    fights.csv, fighters.csv, rankings.csv

Usage (from the repo root):
    python -m scripts.scrape_sherdog_org jungle-fight --dry-run --cache-dir .sherdog-cache
    python -m scripts.scrape_sherdog_org all --cache-dir .sherdog-cache
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

from bs4 import BeautifulSoup

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.scrape_espn import ascii_name, map_weight_class, name_key, save_csv
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
    prefix: str  # what the event's address starts with on Sherdog ("Jungle-Fight-156-...")
    name: str  # the organization as the event page names it
    womens: bool = False  # an all-women's promotion: Sherdog's "Bantamweight" there is the women's division


ORGS: dict[str, SherdogOrg] = {
    "jungle-fight": SherdogOrg("jungle-fight", "Jungle-Fight", "Jungle Fight"),
    "invicta": SherdogOrg("invicta", "Invicta", "Invicta Fighting Championships", womens=True),
}


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


def fight_rows(events: list[dict], org: SherdogOrg) -> list[dict]:
    rows = []
    for event in events:
        for order, bout in enumerate(event["bouts"]):
            one, two = bout["fighter_1"], bout["fighter_2"]
            title = bout["title_fight"]
            rows.append(
                {
                    "event_name": event["name"], "event_date": event["day"].isoformat(), "location": event["location"],
                    "event_url": event["url"], "event_slug": f"{org.id}-{event['id']}", "circuit": "",
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


# --------------------------------------------------------------------------- main


def collect(org: SherdogOrg, fetcher: Fetcher, sitemaps: list[str], *, dry_run: bool) -> int:
    urls: list[str] = []
    for xml in sitemaps:
        urls += event_urls(xml, org.prefix)
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
    for org in ORGS.values() if args.org == "all" else [ORGS[args.org]]:
        status |= collect(org, fetcher, sitemaps, dry_run=args.dry_run)
    return status


if __name__ == "__main__":
    sys.exit(main())
