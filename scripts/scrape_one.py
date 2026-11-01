"""Keep the ONE Championship cards and results in data/raw/one/fights.csv up to date from onefc.com.

Only public, server-rendered pages that onefc.com/robots.txt allows are read: the sitemap and one page per event. A
page has a JSON-LD block (name, start date, venue) and one block per bout: the weight class and discipline ("Lightweight
MMA", "Strawweight Muay Thai World Championship"), the two athletes and, once the bout was fought, a WIN badge on the
winner with the way it ended ("Knockout (R2)", "Unanimous Decision (R3)").

What it does with the file (the history before this script existed is kept exactly as it was):
- a bout on the page that the file does not have is added at the end of its card;
- a bout whose opponent changed (one athlete matches, the other does not) and has no result yet is replaced;
- a bout the file has and the page no longer shows is kept: the page often lists only part of a card, so a missing bout
  cannot be told apart from a cancelled one;
- the winner, the method (U-DEC, KO/TKO, SUB...) and the round are filled in for finished bouts; values already in the
  file are never overwritten, and the time and the technical detail stay blank because the page does not show them;
- an event the file does not have yet is created, with the same name and slug conventions as the others.

Only events whose page changed in the last LASTMOD_DAYS days are opened, and of those only the ones inside
[--since, --until] are used, so a daily run reads a few dozen pages. Athlete profiles (data/raw/one/fighters.csv) are not
touched: an athlete who has no profile there yet is only reported.

Usage (from the repo root):
    python -m scripts.scrape_one --dry-run                 # read the site, report, write nothing
    python -m scripts.scrape_one                           # update data/raw/one/fights.csv
    python -m scripts.scrape_one --since 2026-01-01        # also re-read older events (results, corrections)
    python -m scripts.scrape_one --cache-dir .one-cache    # keep downloaded pages
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from collections import Counter
from datetime import date, timedelta
from difflib import SequenceMatcher
from pathlib import Path

from bs4 import BeautifulSoup

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.scrape_espn import ascii_name, load_csv, name_key, save_csv
from scripts.scrape_pfl import FIGHT_FIELDS, Fetcher
from src.ufc_predictor.config import RAW_DATA_DIR
from src.ufc_predictor.countries import english_name

BASE_URL = "https://www.onefc.com"
SITEMAP_URL = f"{BASE_URL}/sitemap.xml"
OUTPUT_DIR = RAW_DATA_DIR / "one"
FIGHTS_PATH = OUTPUT_DIR / "fights.csv"
FIGHTERS_PATH = OUTPUT_DIR / "fighters.csv"

REQUEST_DELAY_SECONDS = 1.0
# Fought events inside this window are read again, because results are published after the card.
REFRESH_DAYS = 21
# The sitemap lists every event since 2011; only pages the site touched recently are opened.
LASTMOD_DAYS = 60
MAX_EVENT_PAGES = 60
# How alike two spellings of a name must be to be taken for the same person ("Lee Seung Cheol" and "Lee Seung-chul").
NAME_SIMILARITY = 0.86
# Looser bar for the second athlete of a bout whose first athlete already matched ("Vick Souza" / "Victoria Souza").
VARIANT_SIMILARITY = 0.78

CIRCUIT = "ONE Championship"
DISCIPLINES = ("Submission Grappling", "Muay Thai", "Kickboxing", "MMA", "Grappling")
# ONE's own class names. The file has no men's Strawweight: ONE's 125 lb class is stored as Flyweight, like the UFC's.
WOMENS_DIVISIONS = ("Atomweight", "Strawweight", "Flyweight", "Bantamweight", "Featherweight")
DIVISIONS = ("Light Heavyweight", "Heavyweight", "Middleweight", "Welterweight", "Lightweight", "Featherweight", "Bantamweight", "Flyweight", "Strawweight", "Atomweight")
MENS_FOLDING = {"Strawweight": "Flyweight"}
# How the page words a result -> (method code, method detail) as the file stores them.
RESULT_METHODS = {
    "unanimous decision": ("U-DEC", "Unanimous Decision"),
    "split decision": ("S-DEC", "Split Decision"),
    "majority decision": ("M-DEC", "Majority Decision"),
    "knockout": ("KO/TKO", ""),
    "tko": ("KO/TKO", ""),
    "submission": ("SUB", ""),
    "disqualification": ("DQ", "Disqualification"),
}
RESULT_TEXT = re.compile(r"^(?P<method>[A-Za-z' ]+?)\s*\(R(?P<round>\d+)\)\s*$")


# --------------------------------------------------------------------------- small helpers


def clean(value: str | None) -> str:
    return " ".join(html.unescape(value or "").split())


def athlete_slug(url: str) -> str:
    return url.rstrip("/").rsplit("/", 1)[-1]


def athlete_url(slug: str) -> str:
    return f"{BASE_URL}/athletes/{slug}/"


def base_slug(slug: str) -> str:
    """onefc.com numbers athletes that share a name ('magomed-magomedov-3'); the number says nothing about the person."""
    return re.sub(r"-\d+$", "", slug)


def event_title(raw: str) -> str:
    """'ONE Fight Night 49: Gabriel vs. Magomedov' -> 'ONE Fight Night 49'; 'ONE SAMURAI 5' -> 'ONE Samurai 5'."""
    base = clean(raw).split(":")[0].strip()
    return " ".join(word.capitalize() if len(word) > 3 and word.isupper() else word for word in base.split())


def event_slug_of(title: str) -> str:
    """The slug the file uses: the part before ' & ' ('ONE Friday Fights 182 & The Inner Circle 42' -> one-friday-fights-182)."""
    return re.sub(r"[^a-z0-9]+", "-", title.split(" & ")[0].lower()).strip("-")


def default_stage(title: str) -> str:
    inner = re.search(r"The Inner Circle \d+", title)
    return inner.group(0) if inner else title.split(" & ")[0]


def is_same_person(name: str, slug: str, row_name: str, row_url: str) -> bool:
    row_slug = athlete_slug(row_url or "")
    if slug and row_slug and base_slug(slug) == base_slug(row_slug):
        return True
    a, b = name_key(name), name_key(row_name)
    return bool(a) and (a == b or SequenceMatcher(None, a, b).ratio() >= NAME_SIMILARITY)


# --------------------------------------------------------------------------- parsing


def parse_sitemap(xml: str) -> list[tuple[str, str]]:
    """(event page url, last modified day) for every event the sitemap lists."""
    pattern = re.compile(r"<loc>(https://www\.onefc\.com/events/[^<]+?)</loc>\s*(?:<lastmod>([^<]*)</lastmod>)?")
    return [(match.group(1), (match.group(2) or "")[:10]) for match in pattern.finditer(xml)]


def candidate_pages(entries: list[tuple[str, str]], today: date) -> list[str]:
    """Pages touched in the last LASTMOD_DAYS days, the most recently touched first."""
    cutoff = (today - timedelta(days=LASTMOD_DAYS)).isoformat()
    recent = [(modified, url) for url, modified in entries if modified and modified >= cutoff]
    recent.sort(reverse=True)
    return [url for _, url in recent[:MAX_EVENT_PAGES]]


def _json_ld_event(soup: BeautifulSoup) -> dict | None:
    for block in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(block.string or "")
        except ValueError:
            continue
        for item in data if isinstance(data, list) else data.get("@graph", [data]):
            if isinstance(item, dict) and item.get("@type") == "Event":
                return item
    return None


def split_title(text: str) -> dict:
    """'Strawweight Muay Thai World Championship Unification' -> division, discipline and whether a world title is at stake."""
    text = clean(text)
    womens = text.lower().startswith("women's ")
    if womens:
        text = text[len("women's "):]
    division = next((name for name in DIVISIONS if text.startswith(name)), "")
    rest = text[len(division):].strip()
    discipline = next((name for name in DISCIPLINES if rest.startswith(name)), "")
    tail = rest[len(discipline):].strip()
    return {
        "division": division,
        "womens": womens or division == "Atomweight",
        "discipline": discipline,
        "title_fight": bool(re.search(r"\bworld\b.*\b(championship|title)\b|\bworld title\b", tail, re.IGNORECASE)),
    }


def parse_result(text: str) -> dict:
    """'Unanimous Decision (R3)' -> method code, detail and round. Unknown wording keeps only what is understood."""
    match = RESULT_TEXT.match(clean(text))
    if not match:
        return {}
    code, detail = RESULT_METHODS.get(match.group("method").lower(), ("", ""))
    return {"method": code, "method_detail": detail, "round": match.group("round")}


def parse_event_page(page: str, url: str) -> dict | None:
    soup = BeautifulSoup(page, "html.parser")
    data = _json_ld_event(soup)
    if data is None:
        return None
    try:
        day = date.fromisoformat((data.get("startDate") or "")[:10])
    except ValueError:
        return None
    place = data.get("location") or {}
    address = place.get("address") or {}
    event = {
        "url": url,
        "title": event_title(data.get("name") or ""),
        "date": day,
        "venue": clean(place.get("name")),
        "city": clean(address.get("addressLocality")),
        "country_code": (address.get("addressCountry") or "").lower(),
        "bouts": [],
    }
    for block in soup.select("div.event-matchup"):
        title = block.select_one("div.title")
        versus = block.select_one("tr.vs")
        if title is None or versus is None:
            continue
        fighters = [
            (athlete_slug(link.get("href", "")), clean(link.get("title") or link.get_text()))
            for link in versus.select("a[href*='/athletes/']")
        ]
        if len(fighters) != 2:
            continue
        winner, result = "", {}
        for face in block.select("a.face"):
            badge = face.select_one("div.sticker.is-win")
            if badge is None:
                continue
            winner = athlete_slug(face.get("href", ""))
            shown = next((span.get_text() for span in badge.select("span.opacity-50") if "(" in span.get_text()), "")
            result = parse_result(shown)
            break
        event["bouts"].append({"title": clean(title.get_text()), **split_title(title.get_text()), "fighters": fighters, "winner": winner, "result": result})
    return event


# --------------------------------------------------------------------------- merging


class Profiles:
    """The athletes of data/raw/one/fighters.csv, to reuse their spelling and profile link."""

    def __init__(self, rows: list[dict]) -> None:
        self.by_slug: dict[str, dict] = {}
        self.by_key: dict[str, dict] = {}
        for row in rows:
            self.by_slug[base_slug(athlete_slug(row.get("profile_url", "")))] = row
            self.by_slug[base_slug(row.get("slug", ""))] = row
            self.by_key[name_key(row.get("name", ""))] = row

    def find(self, slug: str, name: str) -> dict | None:
        return self.by_slug.get(base_slug(slug)) or self.by_key.get(name_key(name))

    def person(self, slug: str, name: str) -> tuple[str, str]:
        row = self.find(slug, name)
        return (row["name"], row["profile_url"]) if row else (name, athlete_url(slug))


def womens_names(rows: list[dict]) -> set[str]:
    """Athletes the file already has in a women's class: the page does not say which sex a 'Strawweight' bout is."""
    found: set[str] = set()
    for row in rows:
        if (row.get("weight_class") or "").startswith("Women's"):
            found.update((name_key(row["fighter_1"]), name_key(row["fighter_2"])))
    return found


def weight_class(bout: dict, womens: set[str]) -> str:
    division = bout["division"]
    if not division:
        return ""
    is_womens = bout["womens"] or (division in WOMENS_DIVISIONS and any(name_key(name) in womens for _, name in bout["fighters"]))
    if is_womens and division in WOMENS_DIVISIONS:
        return f"Women's {division}"
    return MENS_FOLDING.get(division, division)


def _stage_for(rows: list[dict], title: str) -> str:
    stages = Counter(row["stage"] for row in rows if row["stage"] and row["stage"] != "World Title")
    return stages.most_common(1)[0][0] if stages else default_stage(title)


def _location_for(event: dict, stored_locations: list[str]) -> str:
    """Reuse how the file already spells this city ('Lumpinee Boxing Stadium, Bangkok , Thailand') before building one."""
    country = english_name(event["country_code"]) or event["country_code"].upper()
    if event["city"]:
        known = next((place for place in stored_locations if f", {event['city']} ," in place and place.endswith(country)), None)
        if known:
            return known
    return ", ".join(part for part in (event["venue"], f"{event['city']} " if event["city"] else "", country) if part)


def _same_name_variant(a: str, b: str) -> bool:
    """Two spellings of one athlete: the same given name ('Allycia Rodrigues' / 'Allycia Hellen Rodrigues') or nearly the same name.

    A surname or a gym tag alone is not enough: 'PK Saenchai' and 'Sor.Dechapan' belong to many different fighters."""
    ka, kb = name_key(a), name_key(b)
    first_a, first_b = ascii_name(a).lower().split()[:1], ascii_name(b).lower().split()[:1]
    return bool(first_a) and first_a == first_b or SequenceMatcher(None, ka, kb).ratio() >= VARIANT_SIMILARITY


def _pair_matches(bout: dict, row: dict) -> int:
    """How many of the bout's two athletes are in the stored row (0, 1 or 2), in either order.

    When one athlete matches and the other is only another spelling of the stored one, it is the same bout under another
    spelling and counts as 2; an opponent who shares nothing is a real change and counts as 1."""
    (slug_a, name_a), (slug_b, name_b) = bout["fighters"]
    first = (name_a, slug_a, row["fighter_1"], row["fighter_1_url"]), (name_b, slug_b, row["fighter_2"], row["fighter_2_url"])
    second = (name_a, slug_a, row["fighter_2"], row["fighter_2_url"]), (name_b, slug_b, row["fighter_1"], row["fighter_1_url"])
    best = 0
    for pairs in (first, second):
        matched = [is_same_person(*pair) for pair in pairs]
        hits = sum(matched)
        if hits == 1:
            other = pairs[matched.index(False)]
            if _same_name_variant(other[0], other[2]):
                hits = 2
        best = max(best, hits)
    return best


def _apply_result(row: dict, bout: dict, report: dict) -> None:
    if not bout["winner"] or row.get("winner"):
        return
    fighters = bout["fighters"]
    winner_index = next((index for index, (slug, _) in enumerate(fighters) if slug == bout["winner"]), None)
    if winner_index is None:
        return

    def side_of(index: int) -> str | None:
        slug, name = fighters[index]
        return next((key for key in ("fighter_1", "fighter_2") if is_same_person(name, slug, row[key], row[f"{key}_url"])), None)

    side = side_of(winner_index)
    if side is None:
        # The winner's spelling differs too much ('Khunsuk T1 Fight Academy' / 'Khunsuk T1.FightAcademy'), but the
        # opponent is known: the bout was paired on it, so the winner is the other corner.
        opponent_side = side_of(1 - winner_index)
        side = {"fighter_1": "fighter_2", "fighter_2": "fighter_1"}.get(opponent_side or "")
    if side is None:
        return
    row["winner"] = row[side]
    row["outcome"] = "win"
    for field in ("method", "method_detail", "round"):
        if not row.get(field) and bout["result"].get(field):
            row[field] = bout["result"][field]
    report["results"] += 1


def merge_event(stored: list[dict], event: dict, profiles: Profiles, womens: set[str], stored_locations: list[str], report: dict, *, results: bool = True) -> list[dict]:
    """The rows of one event after reading its page: the stored ones, corrected and completed, plus the new bouts."""
    rows = [dict(row) for row in stored]
    if rows:
        meta = {key: rows[0][key] for key in ("event_name", "event_date", "location", "event_url", "event_slug", "circuit")}
        url_base = rows[0]["fight_url"].split("#")[0] if rows[0]["fight_url"] else event["url"]
    else:
        slug = event_slug_of(event["title"])
        meta = {
            "event_name": event["title"], "event_date": event["date"].isoformat(), "location": _location_for(event, stored_locations),
            "event_url": event["url"], "event_slug": slug, "circuit": CIRCUIT,
        }
        url_base = event["url"]
    stage = _stage_for(rows, event["title"])
    order = max((int(row["card_order"] or 0) for row in rows), default=-1) + 1
    used: set[int] = set()

    for bout in event["bouts"]:
        best = max(((index, _pair_matches(bout, row)) for index, row in enumerate(rows) if index not in used), key=lambda item: item[1], default=(None, 0))
        index, hits = best
        if index is not None and hits == 2:
            used.add(index)
            if results:
                _apply_result(rows[index], bout, report)
            continue
        if index is not None and hits == 1 and not rows[index].get("winner"):
            # One athlete is the same and the other is not: the opponent changed.
            used.add(index)
            (slug_a, name_a), (slug_b, name_b) = bout["fighters"]
            old = f"{rows[index]['fighter_1']} vs {rows[index]['fighter_2']}"
            (n1, u1), (n2, u2) = profiles.person(slug_a, name_a), profiles.person(slug_b, name_b)
            rows[index].update({"fighter_1": n1, "fighter_2": n2, "fighter_1_url": u1, "fighter_2_url": u2})
            report["replaced"].append(f"{meta['event_name']}: {old} -> {n1} vs {n2}")
            continue
        (slug_a, name_a), (slug_b, name_b) = bout["fighters"]
        (n1, u1), (n2, u2) = profiles.person(slug_a, name_a), profiles.person(slug_b, name_b)
        row = {field: "" for field in FIGHT_FIELDS}
        row.update(meta)
        row.update({
            "fight_url": f"{url_base}#bout-{order}", "card_order": str(order), "fighter_1": n1, "fighter_2": n2,
            "fighter_1_url": u1, "fighter_2_url": u2, "weight_class": weight_class(bout, womens),
            "stage": "World Title" if bout["title_fight"] else stage, "title_fight": "true" if bout["title_fight"] else "false",
        })
        if results:
            _apply_result(row, bout, report)
        rows.append(row)
        used.add(len(rows) - 1)
        order += 1
        report["added"].append(f"{meta['event_date']} {meta['event_name']}: {n1} vs {n2} ({bout['title']})")
        for slug, name in ((slug_a, name_a), (slug_b, name_b)):
            if profiles.find(slug, name) is None:
                report["no_profile"].add(name)
    if not stored and rows:
        report["events"].append(f"{event['date']} {event['title']}")
    rows.sort(key=lambda row: int(row["card_order"] or 0))
    return rows


def group_events(rows: list[dict]) -> dict[tuple[str, str], list[dict]]:
    groups: dict[tuple[str, str], list[dict]] = {}
    for row in rows:
        groups.setdefault((row["event_date"], row["event_slug"]), []).append(row)
    return groups


def find_group(groups: dict[tuple[str, str], list[dict]], event: dict) -> tuple[str, str] | None:
    """The stored event that is this page's event: same day, and the same slug when two events share the day."""
    day = event["date"].isoformat()
    same_day = [key for key in groups if key[0] == day]
    if len(same_day) <= 1:
        return same_day[0] if same_day else None
    wanted = event_slug_of(event["title"])
    return next((key for key in same_day if key[1] == wanted), same_day[0])


def merge_all(rows: list[dict], events: list[dict], profiles: Profiles, *, results: bool = True) -> tuple[list[dict], dict]:
    """Every stored row after reading `events`, newest event first and each card in its own order."""
    report: dict = {"added": [], "replaced": [], "events": [], "results": 0, "no_profile": set()}
    groups = group_events(rows)
    position = {key: index for index, key in enumerate(groups)}
    womens = womens_names(rows)
    locations = sorted({row["location"] for row in rows if row["location"]})
    for event in sorted(events, key=lambda item: item["date"]):
        key = find_group(groups, event) or (event["date"].isoformat(), event_slug_of(event["title"]))
        groups[key] = merge_event(groups.get(key, []), event, profiles, womens, locations, report, results=results)
        position.setdefault(key, len(position))
    # Newest first; events that share a day keep the order they had.
    ordered = sorted(groups, key=lambda key: (-date.fromisoformat(key[0]).toordinal(), position[key]))
    return [row for key in ordered for row in groups[key]], report


# --------------------------------------------------------------------------- main


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--since", type=date.fromisoformat, help=f"first event day to use (default: {REFRESH_DAYS} days ago)")
    parser.add_argument("--until", type=date.fromisoformat, help="last event day to use (default: one year ahead)")
    parser.add_argument("--dry-run", action="store_true", help="read the site and report, write nothing")
    parser.add_argument("--no-results", action="store_true", help="only cards: do not fill in winners and methods")
    parser.add_argument("--cache-dir", type=Path, help="keep downloaded pages here, so an interrupted run can resume")
    args = parser.parse_args(argv)

    today = date.today()
    since = args.since or today - timedelta(days=REFRESH_DAYS)
    until = args.until or today + timedelta(days=365)
    if not FIGHTS_PATH.exists():
        print(f"[error] {FIGHTS_PATH} is missing: this script updates the ONE file, it does not build the history")
        return 1
    header, stored = load_csv(FIGHTS_PATH)
    profiles = Profiles(load_csv(FIGHTERS_PATH)[1] if FIGHTERS_PATH.exists() else [])

    fetcher = Fetcher(delay=REQUEST_DELAY_SECONDS, cache_dir=args.cache_dir)
    entries = parse_sitemap(fetcher.get(SITEMAP_URL))
    pages = candidate_pages(entries, today)
    print(f"[info] {len(entries)} event pages in the sitemap, {len(pages)} touched in the last {LASTMOD_DAYS} days")
    events: list[dict] = []
    failures = 0
    for url in pages:
        try:
            event = parse_event_page(fetcher.get(url), url)
        except RuntimeError as error:
            failures += 1
            print(f"[warn] {error}")
            continue
        if event is not None and since <= event["date"] <= until:
            events.append(event)
    print(f"[info] {len(events)} events between {since} and {until} ({failures} pages failed)")
    if not events:
        print("[error] no event found; the file was left untouched")
        return 1

    merged, report = merge_all(stored, events, profiles, results=not args.no_results)
    if len(merged) < len(stored):
        print(f"[error] the merge would drop rows ({len(stored)} -> {len(merged)}); the file was left untouched")
        return 1

    print(f"[info] new events: {len(report['events'])} | new bouts: {len(report['added'])} | bouts with a new opponent: {len(report['replaced'])} | results filled: {report['results']}")
    for item in report["events"]:
        print(f"  + event {item}")
    for item in report["added"]:
        print(f"  + {item}")
    for item in report["replaced"]:
        print(f"  ~ {item}")
    if report["no_profile"]:
        print(f"[info] athletes with no profile in fighters.csv yet: {', '.join(sorted(report['no_profile']))}")
    if args.dry_run:
        print("[dry-run] nothing written")
        return 0
    if merged != stored:
        save_csv(FIGHTS_PATH, header or FIGHT_FIELDS, merged)
        print(f"[info] {FIGHTS_PATH.name} updated: {len(stored)} -> {len(merged)} rows")
    else:
        print("[info] nothing changed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
