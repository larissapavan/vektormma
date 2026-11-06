"""Collect OKTAGON MMA's history (events, bouts, results, fighters) from oktagonmma.com.

The site is a Next.js app that renders every event page on the server and embeds the data it drew the page from
(`<script id="__NEXT_DATA__">`): the event, and its whole fight card with each bout's result, method, round, time,
weight class, title flag and both fighters' profiles (professional record, height, nationality). That is the same
HTML any visitor is served, so this reads the pages themselves; it calls no API of its own.

The list of events is the site's own sitemap (sitemap-events.xml, which robots.txt allows), one page per event.
OKTAGON's robots.txt disallows nothing; the requests are spaced out and identify this project.

What is left out on purpose:
- events of other promotions the site hosts (PML, THE RING, FNC, FABRIQ...): only `organizationId` OKTAGON_MMA is kept;
- Muay Thai, K-1 and amateur bouts that share an OKTAGON card: this is MMA data. Bouts under "stand and bang" or
  "underground" rules stay (they are MMA with restricted rules, as far as the site's names say; worth checking).

What the site does NOT give, and what this script therefore leaves empty rather than guess:
- a fighter's age (only the year of birth) and gym;
- whether a fighter is still active: `status` is "active" when the fighter fought in the last two years (or holds a
  belt), a rule of this script, not the site's;
- rankings: the ranks embedded in a page are those of the day the page was last built, so they differ from page to page
  and are not used. rankings.csv holds only its header.

Output (data/raw/oktagon/), the same three files every non-UFC organization has (see backend/app/services/org_service.py):
    fights.csv, fighters.csv, rankings.csv

It is a daily job (about 150 pages, two minutes): the files are rebuilt from the site, but a day with no change leaves them
byte for byte as they were (a fighter's `checked` date moves only when something about the fighter changed), and a read that
would shrink the files by more than 2% is refused, so a site outage or redesign cannot wipe the history.

Usage (from the repo root):
    python -m scripts.scrape_oktagon --dry-run --cache-dir .oktagon-cache
    python -m scripts.scrape_oktagon --cache-dir .oktagon-cache
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.scrape_espn import ascii_name, load_csv, name_key, save_csv
from scripts.scrape_pfl import FIGHT_FIELDS, FIGHTER_FIELDS, RANKING_FIELDS
from src.ufc_predictor.config import RAW_DATA_DIR
from src.ufc_predictor.countries import english_name

BASE_URL = "https://oktagonmma.com"
SITEMAP_URL = f"{BASE_URL}/sitemap-events.xml"
EVENT_URL = BASE_URL + "/en/events/{slug}/"
FIGHTER_URL = BASE_URL + "/en/fighters/{slug}/"

USER_AGENT = "FightIntelligenceBot/1.0 (+https://github.com/larissapavan; personal stats project; reads public OKTAGON pages)"
OUTPUT_DIR = RAW_DATA_DIR / "oktagon"
REQUEST_DELAY_SECONDS = 0.7
TIMEOUT_SECONDS = 30
RETRIES = 3
ACTIVE_WITHIN_DAYS = 730

# OKTAGON's cards are in Central Europe; an event that starts late in the evening must keep its local date.
LOCAL_ZONES = {
    "CZ": "Europe/Prague", "SK": "Europe/Bratislava", "DE": "Europe/Berlin", "PL": "Europe/Warsaw", "AT": "Europe/Vienna",
    "GB": "Europe/London", "TR": "Europe/Istanbul",
}
DEFAULT_ZONE = "Europe/Prague"
ORGANIZATION = "OKTAGON_MMA"
NOT_MMA = re.compile(r"muay|k-?1\b|amateur", re.IGNORECASE)
# Longest names first: "light heavyweight" must win over "heavyweight".
DIVISIONS = [
    "light heavyweight", "super middleweight", "super welterweight", "super lightweight", "middleweight", "lightweight",
    "welterweight", "featherweight", "bantamweight", "flyweight", "strawweight", "atomweight", "cruiserweight", "heavyweight",
]

# The site's result type -> the codes the UFC data uses (see normalize_method in scripts/scrape_pfl.py).
METHODS = {
    "KO": "KO/TKO", "TKO": "KO/TKO", "TKO_DOC": "KO/TKO", "RTD": "KO/TKO", "SUB": "SUB", "DEC": "DEC",
    "UD": "U-DEC", "UDEC": "U-DEC", "SD": "S-DEC", "SDEC": "S-DEC", "MD": "M-DEC", "MDEC": "M-DEC",
    "DQ": "DQ", "NC": "NO CONTEST", "NO_CONTEST": "NO CONTEST", "DRAW": "Draw",
}
DETAILS = {"TKO_DOC": "Doctor's Stoppage", "RTD": "Corner Stoppage"}


# --------------------------------------------------------------------------- fetching


class Fetcher:
    """GET a page with a delay, retries and an optional on-disk cache."""

    def __init__(self, delay: float = REQUEST_DELAY_SECONDS, cache_dir: Path | None = None, user_agent: str = USER_AGENT) -> None:
        self.delay = delay
        self.cache_dir = cache_dir
        self.session = requests.Session()
        self.session.headers["User-Agent"] = user_agent
        if cache_dir:
            cache_dir.mkdir(parents=True, exist_ok=True)

    def get(self, url: str) -> str | None:
        """The page's text, or None for a page the site does not have (404)."""
        cached = self.cache_dir / (hashlib.sha1(url.encode()).hexdigest()[:20] + ".html") if self.cache_dir else None
        if cached and cached.exists():
            return cached.read_text(encoding="utf-8")
        last_error: Exception | None = None
        for attempt in range(RETRIES):
            time.sleep(self.delay)
            try:
                response = self.session.get(url, timeout=TIMEOUT_SECONDS)
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                if cached:
                    cached.write_text(response.text, encoding="utf-8")
                return response.text
            except requests.RequestException as error:
                last_error = error
                time.sleep(3 * (attempt + 1))
        raise RuntimeError(f"could not read {url}: {last_error}")


def event_slugs(sitemap_xml: str) -> list[str]:
    """The English event pages of the sitemap, one per event, in the order the site lists them."""
    seen: list[str] = []
    for slug in re.findall(r"<loc>" + re.escape(BASE_URL) + r"/en/events/([^/<]+)/</loc>", sitemap_xml):
        if slug not in seen:
            seen.append(slug)
    return seen


# --------------------------------------------------------------------------- parsing


def next_data(html: str) -> dict | None:
    found = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not found:
        return None
    try:
        return json.loads(found.group(1))
    except ValueError:
        return None


def queries_of(data: dict) -> dict[tuple, object]:
    """The page's server-side queries by the first two parts of their key: ("events", "detail"), ("events", "fightCard")..."""
    state = (((data.get("props") or {}).get("pageProps") or {}).get("dehydratedState") or {}).get("queries") or []
    return {tuple(query["queryKey"][:2]): (query.get("state") or {}).get("data") for query in state if query.get("queryKey")}


def text_of(value) -> str:
    """A translated text ({"en": "...", "cs": "..."}): English when there is one, otherwise whatever language exists."""
    if isinstance(value, dict):
        return str(value.get("en") or next((text for text in value.values() if text), "") or "").strip()
    return str(value or "").strip()


def local_day(start: str, country: str) -> date:
    moment = datetime.strptime(start[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
    return moment.astimezone(ZoneInfo(LOCAL_ZONES.get(country, DEFAULT_ZONE))).date()


def location_text(location: dict | None) -> str:
    place = location or {}
    country = english_name(str(place.get("country") or "").lower()) or str(place.get("country") or "")
    return ", ".join(part for part in (text_of(place.get("city")), country) if part)


def division(weight_class: dict | None) -> str:
    """The site's free-text weight class -> one of the divisions the UFC data uses, or "" when it names none.

    "Light heavyweight 93kg Stand And Bang Rules" -> "Light Heavyweight"; "Catchweight 80kg" (and its misspelling
    "Cathweight") -> "Catch Weight"; a women's division gets the "Women's" the UFC data uses. A bare "85 Kg", "Mma" or
    "Oktagon Challenge" names no division, so it is left empty rather than guessed."""
    title = str((weight_class or {}).get("title") or "").strip().lower()
    if not title:
        return ""
    if re.search(r"cat?c?hweight", title):
        return "Catch Weight"
    name = next((known for known in DIVISIONS if known in title), "")
    if not name:
        return ""
    name = name.title()
    return f"Women's {name}" if (weight_class or {}).get("gender") == "FEMALE" else name


def full_name(fighter: dict) -> str:
    return ascii_name(f"{fighter.get('firstName') or ''} {fighter.get('lastName') or ''}".strip())


def parse_event(html: str, slug: str) -> dict | None:
    """One event with its bouts (main event first), or None when the page has no event or no card."""
    data = next_data(html)
    queries = queries_of(data) if data else {}
    detail, card = queries.get(("events", "detail")), queries.get(("events", "fightCard"))
    if not isinstance(detail, dict) or not isinstance(card, list):
        return None
    if detail.get("organizationId") != ORGANIZATION:
        return None
    country = str((detail.get("location") or {}).get("country") or "")
    bouts = []
    for section in card:
        for fight in section.get("fights") or []:
            if NOT_MMA.search(str((fight.get("weightClass") or {}).get("title") or "")):
                continue
            one, two = fight.get("fighter1"), fight.get("fighter2")
            if not (isinstance(one, dict) and isinstance(two, dict)) or not (full_name(one) and full_name(two)):
                continue
            bouts.append({**fight, "fighter1": one, "fighter2": two})
    if not bouts:
        return None
    return {
        "slug": slug,
        "id": detail.get("id"),
        "state": detail.get("state"),
        "name": ascii_name(text_of(detail.get("title"))),
        "day": local_day(str(detail["startDate"]), country),
        "location": location_text(detail.get("location")),
        "bouts": bouts,
    }


def bout_result(fight: dict) -> tuple[str, str, str, str, str, str]:
    """(winner slot 1/2 or "", outcome, method, detail, round, time) of a bout; all empty for one that was not fought."""
    result = str(fight.get("result") or "")
    method_key = str(fight.get("resultType") or "").upper()
    if not result:
        return "", "", "", "", "", ""
    method = METHODS.get(method_key, "")
    detail = DETAILS.get(method_key, "")
    slot = {"FIGHTER_1_WIN": "1", "FIGHTER_2_WIN": "2"}.get(result, "")
    outcome = "win" if slot else "draw" if result == "DRAW" else "no_contest" if result in {"NO_CONTEST", "NC"} else ""
    if outcome in {"draw", "no_contest"}:  # the fighter history counts these by the method text ("Draw", "NO CONTEST")
        method, detail = ("Draw" if outcome == "draw" else "NO CONTEST"), ""
    rounds = fight.get("numRounds")
    return slot, outcome, method, detail, str(rounds) if outcome and rounds else "", str(fight.get("time") or "") if outcome else ""


# --------------------------------------------------------------------------- assembling


def fight_rows(events: list[dict]) -> list[dict]:
    rows = []
    for event in events:
        url = EVENT_URL.format(slug=event["slug"])
        for order, bout in enumerate(event["bouts"]):
            slot, outcome, method, detail, rounds, clock = bout_result(bout)
            one, two = full_name(bout["fighter1"]), full_name(bout["fighter2"])
            champion = bool(bout.get("titleFight"))
            rows.append(
                {
                    "event_name": event["name"], "event_date": event["day"].isoformat(), "location": event["location"],
                    "event_url": url, "event_slug": f"oktagon-{event['slug']}", "circuit": "",
                    "fight_url": f"{url}#fight-{bout.get('id')}", "card_order": order, "fighter_1": one, "fighter_2": two,
                    "fighter_1_url": FIGHTER_URL.format(slug=bout["fighter1"].get("slug")),
                    "fighter_2_url": FIGHTER_URL.format(slug=bout["fighter2"].get("slug")),
                    "winner": {"1": one, "2": two}.get(slot, ""), "outcome": outcome,
                    "weight_class": division(bout.get("weightClass") or bout["fighter1"].get("weightClass")),
                    "stage": "Title Fight" if champion else "", "title_fight": "true" if champion else "",
                    "method": method, "method_detail": detail, "round": rounds, "time": clock,
                }
            )
    return rows


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", ascii_name(name).lower()).strip("-")


def fighter_rows(events: list[dict], fights: list[dict], today: date) -> list[dict]:
    """One row per fighter, from the newest event the fighter is on (events are newest first)."""
    seen: dict[str, dict] = {}
    for event in events:
        for bout in event["bouts"]:
            for key in ("fighter1", "fighter2"):
                fighter = bout[key]
                seen.setdefault(str(fighter.get("slug") or fighter.get("id")), fighter)
    days: dict[str, list[str]] = {}
    for fight in fights:
        if not fight["outcome"]:  # a bout still to come is not a fight the fighter has had
            continue
        for side in ("fighter_1", "fighter_2"):
            days.setdefault(name_key(fight[side]), []).append(fight["event_date"])
    cutoff = (today - timedelta(days=ACTIVE_WITHIN_DAYS)).isoformat()
    taken: set[str] = set()
    rows = []
    for fighter in sorted(seen.values(), key=lambda item: full_name(item).lower()):
        name = full_name(fighter)
        slug = slugify(name)
        slug = slug if slug not in taken else f"{slug}-{fighter.get('id')}"
        taken.add(slug)
        scores = ((fighter.get("scores") or {}).get("MMA_PROFI")) or {}
        wins, losses, draws, no_contests = (scores.get(key) for key in ("wins", "losses", "draws", "noContests"))
        known = None not in (wins, losses, draws)
        own = sorted(days.get(name_key(name), []))
        code = str(fighter.get("nationality") or "").lower()
        image = ((fighter.get("imageProfile") or {}).get("url")) or {}
        rows.append(
            {
                "name": name, "slug": slug, "profile_url": FIGHTER_URL.format(slug=fighter.get("slug")), "circuit": "",
                "nickname": ascii_name(str(fighter.get("nickName") or "").strip()),
                "status": "active" if fighter.get("champion") or (own and own[-1] >= cutoff) else "inactive",
                "career_record": f"{wins}-{losses}-{draws}" if known else "", "org_record": "",
                "wins": wins if known else "", "losses": losses if known else "", "draws": draws if known else "",
                "no_contests": no_contests or "", "age": "", "height_cm": fighter.get("heightCm") or "", "weight_lbs": "",
                "reach_cm": "", "leg_reach_cm": "", "hometown": "", "country": english_name(code) or "", "country_code": code if english_name(code) else "",
                "fighting_out_of": "", "camp": "", "weight_class": division(fighter.get("weightClass")),
                "headshot_url": text_of(image), "image_url": "",
                "first_fight_date": own[0] if own else "", "last_fight_date": own[-1] if own else "", "checked": today.isoformat(),
            }
        )
    return rows


def keep_checked(rows: list[dict], stored: list[dict]) -> list[dict]:
    """The fighter rows, each one that is the same as the stored row (apart from the day it was checked) kept as stored."""
    by_url = {row["profile_url"]: row for row in stored}
    kept = []
    for row in rows:
        old = by_url.get(row["profile_url"])
        same = old is not None and all(old.get(key, "") == str(value) for key, value in row.items() if key != "checked")
        kept.append(old if same else row)
    return kept


# --------------------------------------------------------------------------- main


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--dry-run", action="store_true", help="read and report, write nothing")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY_SECONDS)
    parser.add_argument("--cache-dir", type=Path, help="keep every page here so an interrupted run resumes")
    args = parser.parse_args(argv)

    fetcher = Fetcher(args.delay, args.cache_dir)
    sitemap = fetcher.get(SITEMAP_URL)
    slugs = event_slugs(sitemap or "")
    print(f"[info] {len(slugs)} events in the sitemap")
    if not slugs:
        print("[error] no events; files left untouched")
        return 1

    events: list[dict] = []
    skipped: list[str] = []
    for position, slug in enumerate(slugs, 1):
        html = fetcher.get(EVENT_URL.format(slug=slug))
        event = parse_event(html, slug) if html else None
        if event:
            events.append(event)
        else:
            skipped.append(slug)
        if position % 50 == 0:
            print(f"[info] {position}/{len(slugs)} pages read")
    events.sort(key=lambda event: (event["day"], event["id"] or 0), reverse=True)
    print(f"[info] {len(events)} events with a card; {len(skipped)} without one (first: {skipped[:5]})")
    if not events:
        print("[error] no events; files left untouched")
        return 1

    states = Counter(str(event["state"]) for event in events)
    print(f"[info] event states: {dict(states)}")

    fights = fight_rows(events)
    rows = fighter_rows(events, fights, date.today())
    unmapped = Counter(str(bout.get("resultType")) for event in events for bout in event["bouts"] if str(bout.get("result")).endswith("_WIN") and bout.get("resultType") and str(bout["resultType"]).upper() not in METHODS)
    if unmapped:
        print(f"[warn] result types the site uses that have no method code here: {dict(unmapped)}")
    no_method = [f"{f['event_name']}: {f['fighter_1']} vs {f['fighter_2']}" for f in fights if f["outcome"] == "win" and not f["method"]]
    if no_method:
        print(f"[warn] {len(no_method)} won bouts with no method on the site (left empty): {no_method[:3]}")
    print(f"[info] {len(fights)} bouts, {len(rows)} fighters, {sum(1 for f in fights if f['title_fight'])} title bouts, {sum(1 for f in fights if not f['outcome'])} bouts to come")
    stored_fights = load_csv(OUTPUT_DIR / "fights.csv")[1] if (OUTPUT_DIR / "fights.csv").exists() else []
    stored_fighters = load_csv(OUTPUT_DIR / "fighters.csv")[1] if (OUTPUT_DIR / "fighters.csv").exists() else []
    if stored_fights and len(fights) < len(stored_fights) * 0.98:
        print(f"[error] the read would shrink the files ({len(stored_fights)} -> {len(fights)} bouts); they were left untouched")
        return 1
    rows = keep_checked(rows, stored_fighters)
    as_text = lambda items: [{key: str(value) for key, value in item.items()} for item in items]  # noqa: E731 - the stored rows are all text
    if args.dry_run:
        print("[dry-run] nothing written")
        return 0
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if as_text(fights) != stored_fights:
        save_csv(OUTPUT_DIR / "fights.csv", FIGHT_FIELDS, fights)
    if as_text(rows) != stored_fighters:
        save_csv(OUTPUT_DIR / "fighters.csv", FIGHTER_FIELDS, rows)
    if not (OUTPUT_DIR / "rankings.csv").exists():
        save_csv(OUTPUT_DIR / "rankings.csv", RANKING_FIELDS, [])
    return 0


if __name__ == "__main__":
    sys.exit(main())
