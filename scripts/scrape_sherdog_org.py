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

KSW, RIZIN and LFA are a different case: ESPN has only part of the bouts of most of their cards (a card with 1 or 2 bouts where
Sherdog lists 10), and nothing for some events (ESPN stops in 2024 for KSW and RIZIN), so for them this script only ADDS to the
files ESPN wrote and never takes an ESPN bout away:
- an event ESPN does not have is added whole (its slug has "-sherdog-" in it);
- an event ESPN has gets the bouts it is missing, under ESPN's own event (name, date, address, slug), so the site shows one
  card; the bouts are told apart by a Sherdog address in `fight_url`. The card order of that event follows Sherdog's (main
  event first, which ESPN's order does not always do); a bout only ESPN has goes after them;
- fighters keep the spelling and profile ESPN gave them. A bout counts as the same one when it has the same two fighters, or
  the same opponent and a fighter whose name differs by a letter or the order of the words (a spelling that card settles, and
  that is listed in the report). Other names that look alike are listed for review, never merged;
- a second run replaces only what an earlier run added.

The daily refresh (`daily`, or --recent-days N) does not read every page again. Sherdog's sitemap has no modification dates,
so it reads the events the files already have from the last N days (their results come in after the card) and the ones the
files do not have yet (an event Sherdog created after the newest it knew), puts them in place of the stored rows of the same
events and leaves everything else as it was.

Output (data/raw/<org>/), the same three files every non-UFC organization has (see backend/app/services/org_service.py):
    fights.csv, fighters.csv, rankings.csv

Usage (from the repo root):
    python -m scripts.scrape_sherdog_org jungle-fight --dry-run --cache-dir .sherdog-cache
    python -m scripts.scrape_sherdog_org all --cache-dir .sherdog-cache        # Jungle Fight and Invicta FC
    python -m scripts.scrape_sherdog_org ksw --cache-dir .sherdog-cache        # add KSW from 2025 on to the ESPN files
    python -m scripts.scrape_sherdog_org rizin --cache-dir .sherdog-cache      # add RIZIN from 2025 on to the ESPN files
    python -m scripts.scrape_sherdog_org daily                                 # the daily refresh of all four
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
RECENT_DAYS = 45
NEWEST_EVENTS = 25  # the daily refresh of an organization another source also writes reads this many of the newest Sherdog events
DECISIONS = {"U-DEC", "S-DEC", "M-DEC", "DEC"}


@dataclass(frozen=True)
class SherdogOrg:
    id: str  # the organization id: data/raw/<id>, the URL prefix and the event slug prefix
    prefixes: tuple[str, ...]  # what the event's address starts with on Sherdog ("Jungle-Fight-156-...")
    name: str  # the organization as the event page names it
    womens: bool = False  # an all-women's promotion: Sherdog's "Bantamweight" there is the women's division
    # Set for an organization whose files another source wrote: this script adds to them (events from this day on) instead of
    # building the files from Sherdog alone.
    since: date | None = None


ORGS: dict[str, SherdogOrg] = {
    "jungle-fight": SherdogOrg("jungle-fight", ("Jungle-Fight",), "Jungle Fight"),
    "invicta": SherdogOrg("invicta", ("Invicta",), "Invicta Fighting Championships", womens=True),
    # ESPN has KSW and Rizin up to the end of 2024 (KSW 101 on 2024-12-20, Rizin 49 on 2024-12-31), and only part of the bouts of
    # most cards; Sherdog has the rest and what came after.
    "ksw": SherdogOrg("ksw", ("KSW-", "Konfrontacja"), "Konfrontacja Sztuk Walki", since=date(2004, 1, 1)),
    "rizin": SherdogOrg("rizin", ("Rizin-", "RIZIN"), "Rizin Fighting Federation", since=date(2015, 1, 1)),
    # ESPN lists LFA's cards from 2017 but only part of their bouts, and it stays the daily source of its own rows; Sherdog completes them.
    "lfa": SherdogOrg("lfa", ("LFA-",), "Legacy Fighting Alliance (LFA)", since=date(2017, 1, 1)),
}
# What `all` runs: the organizations built from Sherdog alone. The others add to files another source wrote, so they run by name.
STANDALONE = [org_id for org_id, org in ORGS.items() if org.since is None]
# People the files already have under another spelling, confirmed by hand (Sherdog's spelling -> the one already in the files).
# Only equal names are merged by the script; a name that merely looks alike is listed for review until it is added here.
# (A spelling that a card settles by itself, see match_bouts, does not need to be here.)
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
    """The rows of the events. An event with `espn` (the stored row of a card ESPN already has) puts its bouts under that card:
    ESPN's name, date, place, address and slug; a bout with `order` keeps the position it has on Sherdog's card."""
    rows = []
    for event in events:
        card = event.get("espn") or {}
        for position, bout in enumerate(event["bouts"]):
            order = bout.get("order", position)
            one, two = bout["fighter_1"], bout["fighter_2"]
            title = bout["title_fight"]
            rows.append(
                {
                    "event_name": card.get("event_name", event["name"]), "event_date": card.get("event_date", event["day"].isoformat()),
                    "location": card.get("location", event["location"]), "event_url": card.get("event_url", event["url"]),
                    "event_slug": card.get("event_slug", f"{slug_prefix(org)}-{event['id']}"), "circuit": card.get("circuit", ""),
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


def is_sherdog(row: dict) -> bool:
    """A row this script wrote (its `fight_url` is a Sherdog address); ESPN's rows have ESPN's."""
    return row["fight_url"].startswith(BASE_URL)


def event_page(row: dict) -> str:
    """The Sherdog event page a row of this script came from ("https://www.sherdog.com/events/KSW-100-...-103747")."""
    return row["fight_url"].split("#", 1)[0]


def alike(one: str, other: str, floor: float = 0.75) -> bool:
    """Two name keys that are one person written two ways: the same words in another order, the same letters split differently by an
    apostrophe or a hyphen ("Tre'ston" is two words to name_key), or a letter or an accent apart."""
    return (
        one == other
        or sorted(one.split()) == sorted(other.split())
        or sorted(one.replace(" ", "")) == sorted(other.replace(" ", ""))
        or SequenceMatcher(None, one, other).ratio() >= floor
    )


def same_bout(theirs: tuple[str, str], ours: tuple[str, str]) -> dict[str, str] | None:
    """The spellings that make a Sherdog bout the stored one, or None when it is another bout.

    One fighter is the same in both and the other is written differently (an opponent in the same card cannot be anyone else), or
    both are written a little differently and each is close to its counterpart."""
    for x in (0, 1):
        for y in (0, 1):
            one, two, other_one, other_two = theirs[x], theirs[1 - x], ours[y], ours[1 - y]
            if one == other_one and two != other_two and alike(two, other_two):
                return {two: other_two}
            if one != other_one and two != other_two and alike(one, other_one, 0.85) and alike(two, other_two, 0.85):
                return {one: other_one, two: other_two}
    return None


def match_bouts(bouts: list[dict], rows: list[dict], aliases: dict[str, str] | None = None) -> tuple[dict[int, int], dict[str, str]]:
    """Which Sherdog bout is which stored row of the same card: {bout position: row position}, and the spellings that settled it.

    Same two fighters first (a name already known under another spelling, `aliases`, counts as that spelling). A bout left over
    is the same one under another spelling only when it is the single candidate for a row and that row is the single candidate
    for it; two doubtful bouts in a card are left apart rather than guessed."""
    aliases = aliases or {}
    theirs = [tuple(aliases.get(key, key) for key in (name_key(bout["fighter_1"]["name"]), name_key(bout["fighter_2"]["name"]))) for bout in bouts]
    ours = [(name_key(row["fighter_1"]), name_key(row["fighter_2"])) for row in rows]
    matched: dict[int, int] = {}
    taken: set[int] = set()
    for i, pair in enumerate(theirs):
        for j, stored in enumerate(ours):
            if j not in taken and frozenset(pair) == frozenset(stored):
                matched[i] = j
                taken.add(j)
                break
    open_rows = [j for j in range(len(ours)) if j not in taken]
    candidates = {i: [(j, spelling) for j in open_rows if (spelling := same_bout(pair, ours[j])) is not None] for i, pair in enumerate(theirs) if i not in matched}
    spellings: dict[str, str] = {}
    for i, found in candidates.items():
        if len(found) == 1 and sum(1 for other in candidates.values() if any(j == found[0][0] for j, _ in other)) == 1:
            matched[i] = found[0][0]
            spellings.update(found[0][1])
    return matched, spellings


def supplement(org: SherdogOrg, events: list[dict], fights: list[dict], fighters: list[dict], today: date, *, incremental: bool = False) -> tuple[list[dict], list[dict], dict]:
    """The files another source wrote plus what Sherdog has for this organization from `org.since` on.

    An event the files do not have is added whole. An event they have gets the bouts it is missing. No row of the other source is
    taken away, and nothing in it is changed except three facts the new bouts make stale: the first/last fight date and `status` of
    a fighter who is on a new bout (marked inactive and fought within two years: marked active, never the other way round), and the
    `card_order` of the bouts of a card that was completed (Sherdog's order, a bout only the other source has goes after it).
    Rows an earlier run of this script added are replaced, so a second run gives the same files.

    `incremental` is the daily refresh: `events` are only the ones read again (see select_recent), so only the rows this script
    added to those events are replaced and every other row, Sherdog's included, stays. It also serves an organization built from
    Sherdog alone (no `since`), whose stored rows are all Sherdog's."""
    report: dict = {"skipped_overlap": [], "completed": [], "respelled": [], "same_name": [], "possible_same": [], "womens_unresolved": 0, "womens_fixed": 0}
    # The files know a fighter by name, so a bout between two people who share one (two "Lucas Silva" on one card, two profiles) cannot be told
    # from a fighter booked against themself: it is left out and listed.
    fresh = []
    for event in events:
        if org.since is None or event["day"] >= org.since:
            usable = [bout for bout in event["bouts"] if name_key(bout["fighter_1"]["name"]) != name_key(bout["fighter_2"]["name"])]
            report["same_name"] += [f"{event['day']} {event['name']}: {bout['fighter_1']['name']}" for bout in event["bouts"] if bout not in usable]
            if usable:
                fresh.append({**event, "bouts": usable})
    fresh_pages = {event["url"] for event in fresh}
    if incremental:
        base_fights = [dict(row) for row in fights if event_page(row) not in fresh_pages]
        base_fighters = [dict(row) for row in fighters]
    else:
        base_fights = [dict(row) for row in fights if not is_sherdog(row)]
        base_fighters = [row for row in fighters if not row["profile_url"].startswith(BASE_URL)]
    known = {name_key(row["name"]): row for row in base_fighters}
    # Who is the same person is decided differently by source: inside Sherdog a person is their profile address (two fighters can
    # share a name), while a person the files have from ANOTHER source (ESPN) is matched by name, or by SAME_PERSON.
    other_source = {name_key(row["name"]): row for row in base_fighters if not row["profile_url"].startswith(BASE_URL)}
    known_urls = {row["profile_url"] for row in base_fighters}
    aliases = {name_key(sherdog): name_key(espn) for sherdog, espn in SAME_PERSON.get(org.id, {}).items() if name_key(espn) in other_source}

    # The cards the other source has, by event: a Sherdog card is one of them when a day apart at most and a bout is the same one.
    stored: dict[str, list[dict]] = {}
    for row in base_fights:
        if not is_sherdog(row) or event_page(row) not in fresh_pages:
            stored.setdefault(row["event_slug"], []).append(row)
    by_day: dict[str, list[str]] = {}
    for slug, rows in stored.items():
        by_day.setdefault(rows[0]["event_date"], []).append(slug)

    def best_match(event: dict) -> tuple[int, str, dict[int, int], dict[str, str]] | None:
        best = None
        for offset in (-1, 0, 1):
            for slug in by_day.get((event["day"] + timedelta(days=offset)).isoformat(), []):
                rows = [row for row in stored[slug] if not is_sherdog(row)]
                matched, spellings = match_bouts(event["bouts"], rows, aliases)
                if matched and (best is None or len(matched) > best[0]):
                    best = (len(matched), slug, matched, spellings)
        return best

    # A spelling a card settles holds for the whole organization, including a card that has it twice or in a bout whose two names
    # are both written differently: learn them from every card first (a name learned in one card can settle another), then match.
    for _ in range(3):
        learned = len(aliases)
        for event in fresh:
            found = best_match(event)
            for sherdog_name, stored_name in (found[3] if found else {}).items():
                # Never a name the files already have as a fighter of their own (ESPN lists "David Oliva" and "David Olivia" as two
                # profiles): the card still tells the bout is the same one, but renaming a fighter ESPN knows would swap two people.
                if stored_name in other_source and sherdog_name not in other_source and aliases.get(sherdog_name) != stored_name:
                    aliases[sherdog_name] = stored_name
                    report["respelled"].append(f"{event['day']} {event['name']}: {sherdog_name} = {stored_name}")
        if len(aliases) == learned:
            break

    added: list[dict] = []
    for event in fresh:
        best = best_match(event)
        if best is None:
            added.append(event)
            continue
        _, slug, matched, _ = best
        rows = [row for row in stored[slug] if not is_sherdog(row)]
        missing = [{**bout, "order": position} for position, bout in enumerate(event["bouts"]) if position not in matched]
        if missing:
            # A card that gets bouts takes Sherdog's order for the bouts of both sources (main event first), and the bouts only the
            # other source has go after them. A card that is already complete keeps the order it has.
            for i, j in matched.items():
                rows[j]["card_order"] = str(i)
            left = sorted((row for position, row in enumerate(rows) if position not in matched.values()), key=lambda row: int(row["card_order"] or 0))
            for offset, row in enumerate(left):
                row["card_order"] = str(len(event["bouts"]) + offset)
            added.append({**event, "bouts": missing, "espn": rows[0]})
            report["completed"].append(f"{event['day']} {event['name']}: {len(rows)} -> {len(rows) + len(missing)} bouts")
        else:
            report["skipped_overlap"].append(f"{event['day']} {event['name']}")

    new_fights = fight_rows(added, org)
    women = womens_names(base_fights)
    # A division the file only knows as a women's one (KSW's Strawweight and Flyweight: nine and ten "Women's" bouts, no men's)
    # is a women's division for the new bouts too, even between two fighters the file has not seen.
    labelled = Counter(row["weight_class"] for row in base_fights)
    womens_only = {name for name in AMBIGUOUS_DIVISIONS if labelled[f"Women's {name}"] and not labelled[name]}
    substituted: set[str] = set()  # Sherdog profiles that turned out to be a person the files already have from another source
    for row in new_fights:
        for side in ("fighter_1", "fighter_2"):
            if row[f"{side}_url"] in known_urls:  # the same Sherdog profile the files already have
                continue
            existing = other_source.get(aliases.get(name_key(row[side]), name_key(row[side])))
            if existing:  # the spelling and the profile ESPN already gave this person
                substituted.add(row[f"{side}_url"])
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

    new_people = [row for row in fighter_rows(added, new_fights, today) if row["profile_url"] not in known_urls and row["profile_url"] not in substituted]
    taken = {row["slug"] for row in base_fighters}
    for person in new_people:  # a slug is not shared with a fighter the files already have (the photo path and the address follow it)
        if person["slug"] in taken:
            person["slug"] = f"{person['slug']}-{person['profile_url'].rsplit('-', 1)[-1]}"
        taken.add(person["slug"])
    for person in new_people:  # a name that is not equal to one ESPN has but looks like it: for a human to look at
        close = max(((SequenceMatcher(None, name_key(person["name"]), key).ratio(), row["name"]) for key, row in known.items() if key != name_key(person["name"])), default=(0, ""))
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
    report.update(events=added, new_bouts=len(new_fights), new_people=len(new_people))
    return combined, all_fighters, report


def event_id(url: str) -> str:
    return url.rsplit("-", 1)[-1]


def select_recent(urls: list[str], known: dict[str, str], today: date, recent_days: int, newest: int = 0) -> list[str]:
    """The event pages the daily refresh reads: the known events from the last `recent_days` days (`known` is event id -> day),
    and the unknown ones created after the files' last recent event (a Sherdog id only grows, so an older unknown id is an
    event the files never wanted: another promoter's, or one from before this organization's first day).

    `newest` adds the pages with the highest ids: for an organization another source also writes, a card that source has only
    just listed may be an event Sherdog created long before, whose id is older than every event this script put in the files."""
    cutoff = (today - timedelta(days=recent_days)).isoformat()
    number = lambda ident: int(ident) if ident.isdigit() else -1  # noqa: E731
    recent = [number(ident) for ident, day in known.items() if day >= cutoff]
    floor = min(recent) if recent else max((number(ident) for ident in known), default=0)
    latest = {url for url in sorted(urls, key=lambda url: number(event_id(url)))[-newest:]} if newest else set()
    return [url for url in urls if url in latest or (known[event_id(url)] >= cutoff if event_id(url) in known else number(event_id(url)) >= floor)]


def known_events(org: SherdogOrg, fights: list[dict]) -> dict[str, str]:
    """Event id -> day of the events this script put bouts in (Sherdog's rows, not ESPN's: they are told apart by their address)."""
    return {event_id(event_page(row)): row["event_date"] for row in fights if is_sherdog(row)}


# --------------------------------------------------------------------------- main


def collect(org: SherdogOrg, fetcher: Fetcher, sitemaps: list[str], *, dry_run: bool, recent_days: int | None = None) -> int:
    urls: list[str] = []
    for xml in sitemaps:
        for prefix in org.prefixes:
            urls += event_urls(xml, prefix)
    urls = list(dict.fromkeys(urls))
    print(f"[info] {org.id}: {len(urls)} candidate events in the sitemap")
    incremental = recent_days is not None
    if incremental:
        folder = RAW_DATA_DIR / org.id
        if not (folder / "fights.csv").exists() or not (folder / "fighters.csv").exists():
            print(f"[error] {org.id}: no files to refresh in {folder}; run it once in full first")
            return 1
        urls = select_recent(urls, known_events(org, load_csv(folder / "fights.csv")[1]), date.today(), recent_days, NEWEST_EVENTS if org.since else 0)
        print(f"[info] {org.id}: {len(urls)} of them to read: the events of the last {recent_days} days and the ones not in the files yet")
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
    if not events and incremental:
        print(f"[info] {org.id}: nothing new to put in the files")
        return 0
    if not events:
        print(f"[error] {org.id}: no events; files left untouched")
        return 1

    if org.since or incremental:
        return collect_supplement(org, events, dry_run=dry_run, incremental=incremental)

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


def collect_supplement(org: SherdogOrg, events: list[dict], *, dry_run: bool, incremental: bool = False) -> int:
    """Add the events from org.since on to the files another source wrote (see supplement)."""
    folder = RAW_DATA_DIR / org.id
    if not (folder / "fights.csv").exists() or not (folder / "fighters.csv").exists():
        print(f"[error] {org.id}: {folder} has no files to add to (this organization is built from another source first); nothing done")
        return 1
    _, fights = load_csv(folder / "fights.csv")
    _, fighters = load_csv(folder / "fighters.csv")
    combined, people, report = supplement(org, events, fights, fighters, date.today(), incremental=incremental)
    added = report["events"]
    if not added:
        if incremental:
            print(f"[info] {org.id}: nothing new to put in the files")
            return 0
        print(f"[error] {org.id}: no event from {org.since} on; files left untouched")
        return 1
    if len(combined) < len(fights) * 0.98:  # this script only adds: fewer rows than the files have means something went wrong
        print(f"[error] {org.id}: the run would drop rows ({len(fights)} -> {len(combined)}); files left untouched")
        return 1
    since = f" from {org.since} on" if org.since else ""
    print(f"[info] {org.id}: {len(added)} events{since} ({min(e['day'] for e in added)} to {max(e['day'] for e in added)}), {report['new_bouts']} bouts, {report['new_people']} new fighters")
    print(f"[info] {org.id}: {sum(1 for e in added for b in e['bouts'] if not b['outcome'])} bouts still to come, {sum(1 for e in added for b in e['bouts'] if b['title_fight'])} title bouts")
    print(f"[info] {org.id}: {report['womens_fixed']} bouts marked as women's (a women's-only division here, or a woman the files already have); {report['womens_unresolved']} bouts in a division name both sexes use are left as Sherdog writes it (nearly all men's)")
    if report["completed"]:
        print(f"[info] {org.id}: {len(report['completed'])} cards the files already had were completed with the bouts they missed: {report['completed'][:3]}")
    if report["skipped_overlap"]:
        print(f"[info] {org.id}: {len(report['skipped_overlap'])} cards the files already have complete")
    if report["same_name"]:
        print(f"[review] {org.id}: {len(report['same_name'])} bouts between two people with the same name were left out (the files know a fighter by name): {report['same_name'][:4]}")
    if report["respelled"]:
        print(f"[review] {org.id}: {len(report['respelled'])} names settled by the card they are in (same opponent, same day), written the way the files already have them: {report['respelled'][:6]}")
    if report["possible_same"]:
        print(f"[review] {org.id}: new names that look like names the files already have (not merged): {report['possible_same'][:12]}")
    print(f"[info] {org.id}: files now {len(combined)} bouts and {len(people)} fighters (before: {len(fights)} and {len(fighters)})")
    if dry_run:
        print(f"[dry-run] {org.id}: nothing written")
        return 0
    if combined != fights:
        save_csv(folder / "fights.csv", FIGHT_FIELDS, combined)
    if people != fighters:
        save_csv(folder / "fighters.csv", FIGHTER_FIELDS, people)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("org", choices=[*ORGS, "all", "daily"], help="`all`: the ones built from Sherdog alone; `daily`: the refresh of all four")
    parser.add_argument("--dry-run", action="store_true", help="read and report, write nothing")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY_SECONDS)
    parser.add_argument("--cache-dir", type=Path, help="keep every page here so an interrupted run resumes")
    parser.add_argument("--recent-days", type=int, nargs="?", const=RECENT_DAYS, help=f"only the events of the last N days (default {RECENT_DAYS}) and the ones not in the files yet")
    args = parser.parse_args(argv)
    recent_days = RECENT_DAYS if args.org == "daily" and args.recent_days is None else args.recent_days

    fetcher = Fetcher(args.delay, args.cache_dir, user_agent=USER_AGENT)
    sitemaps = [text for text in (fetcher.get(url) for url in SITEMAPS) if text]
    if not sitemaps:
        print("[error] Sherdog's sitemaps could not be read; files left untouched")
        return 1
    status = 0
    chosen = [ORGS[org_id] for org_id in STANDALONE] if args.org == "all" else list(ORGS.values()) if args.org == "daily" else [ORGS[args.org]]
    for org in chosen:
        status |= collect(org, fetcher, sitemaps, dry_run=args.dry_run, recent_days=recent_days)
    return status


if __name__ == "__main__":
    sys.exit(main())
