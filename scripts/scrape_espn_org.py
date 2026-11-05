"""Collect an organization's history from ESPN's public JSON API: RIZIN, KSW, LFA and Cage Warriors.

These are the organizations ESPN has a league for (the same API scripts/scrape_bellator.py reads for Bellator). One run
reads every event of the league year by year, each bout's method (one call per bout) and each fighter's profile.

What ESPN does NOT give for these leagues, and what this script therefore leaves empty rather than guess:
- the title flag of a bout (no belt information in the answers): `title_fight` and `stage` stay empty, and there are no
  rankings (rankings.csv holds only its header);
- the weight class of most bouts: it comes from the bout when ESPN names it (some LFA cards), otherwise from the division
  both fighters' ESPN profiles agree on, otherwise from the division each fighter usually fights at.

Coverage is whatever ESPN has (for most cards of RIZIN, KSW and LFA only part of their bouts: scripts/scrape_sherdog_org.py adds the rest,
and its rows are kept when this script refreshes a card), and it differs by league (checked 2 Nov 2026 by counting events per year):
RIZIN 2015-2024, KSW 2004-2024, LFA 2017-2026, Cage Warriors 2005-2026 (thin from 2025). Events ESPN does not list are
not here. What Sherdog has for RIZIN, KSW and LFA and ESPN does not (whole events, and the bouts missing from its cards) is added by
scripts/scrape_sherdog_org.py ksw|rizin|lfa, which adds to the files this script wrote and must run after it: running this script
again in full rewrites them from ESPN alone.

Output (data/raw/<org>/), the same three files every non-UFC organization has (see backend/app/services/org_service.py):
    fights.csv, fighters.csv, rankings.csv

The first run of a league makes thousands of calls; --cache-dir keeps every answer so an interrupted run resumes. The daily
refresh does not repeat that: `--recent-days N` reads only the last N days and the cards still to come, replaces those
events in the files and leaves every older row as it was.

RIZIN and KSW are frozen: ESPN has nothing after 2024 for them and the later events were added from Sherdog to the same files
(scripts/scrape_sherdog_org.py), so `all` and the daily refresh skip them, and naming one asks for --rewrite-frozen because
a full run would drop what Sherdog added.

Usage (from the repo root):
    python -m scripts.scrape_espn_org lfa --dry-run --cache-dir .espn-cache
    python -m scripts.scrape_espn_org lfa --cache-dir .espn-cache
    python -m scripts.scrape_espn_org all --cache-dir .espn-cache --photos
    python -m scripts.scrape_espn_org all --recent-days 45           # the daily refresh: LFA and Cage Warriors
"""

from __future__ import annotations

import argparse
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

import requests

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.scrape_bellator import (
    JsonFetcher,
    bout_outcome,
    fighter_rows,
    fill_weight_classes,
    parse_athlete,
    parse_bout_method,
    propagate_weight_classes,
)
from scripts.scrape_espn import ascii_name, clean_clock, clean_round, load_csv, map_weight_class, name_key, save_csv
from scripts.scrape_pfl import FIGHT_FIELDS, FIGHTER_FIELDS, RANKING_FIELDS
from src.ufc_predictor.config import BASE_DIR, RAW_DATA_DIR

SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/mma/{league}/scoreboard"
SHERDOG_URL = "https://www.sherdog.com"  # where the rows scripts/scrape_sherdog_org.py added to these files point
CORE_URL = "https://sports.core.api.espn.com/v2/sports/mma/leagues/{league}"
ATHLETE_URL = "https://sports.core.api.espn.com/v2/sports/mma/athletes/{athlete_id}?lang=en"
ATHLETE_PAGE_URL = "https://www.espn.com/mma/fighter/_/id/{athlete_id}"
EVENT_PAGE_URL = "https://www.espn.com/mma/fightcenter/_/id/{event_id}/league/{league}"

USER_AGENT = "FightIntelligenceBot/1.0 (+https://github.com/larissapavan; personal stats project; reads public ESPN JSON)"
PHOTO_MAX_WIDTH = 300
PHOTO_WEBP_METHOD = 4
WORKERS = 4
REQUEST_DELAY_SECONDS = 0.25
TIMEOUT_SECONDS = 30

# An evening card in these countries falls on the next UTC day, so ESPN's date is one day late for it.
AMERICAS = {
    "USA", "Canada", "Brazil", "Mexico", "Argentina", "Chile", "Colombia", "Peru", "Uruguay", "Paraguay", "Ecuador",
    "Bolivia", "Venezuela", "Costa Rica", "Panama", "Dominican Republic", "Puerto Rico", "Guatemala", "Honduras",
}


@dataclass(frozen=True)
class League:
    id: str  # the organization id: data/raw/<id>, the URL prefix and the event slug prefix
    espn: str  # ESPN's league slug
    first_year: int
    # Where an event with no venue in ESPN's answer is assumed to be: LFA's cards are almost all in the Americas.
    default_americas: bool = False
    # Text ESPN puts in front of the event name that adds nothing ("Rizin FF: Rizin Fighting Federation 40").
    name_prefix: str = ""
    # ESPN has nothing recent and another source continued the files (see the module docstring).
    frozen: bool = False


LEAGUES: dict[str, League] = {
    "rizin": League("rizin", "rizin", 2015, name_prefix="Rizin FF: ", frozen=True),
    "ksw": League("ksw", "ksw", 2004, frozen=True),
    "lfa": League("lfa", "lfa", 2017, default_americas=True),
    "cage-warriors": League("cage-warriors", "cage-warriors", 2005),
}


# --------------------------------------------------------------------------- fetching


class Fetcher(JsonFetcher):
    """JsonFetcher that waits and tries again when ESPN throttles, instead of failing the whole run on one answer."""

    def __init__(self, delay: float, cache_dir: Path | None) -> None:
        super().__init__(delay=delay, cache_dir=cache_dir)
        self.session.headers["User-Agent"] = USER_AGENT
        self.failures = 0

    def get(self, url: str, params: dict | None = None, *, optional: bool = False) -> dict:
        for attempt in range(3):
            try:
                return super().get(url, params)
            except RuntimeError:
                time.sleep(10 * (attempt + 1))
        if optional:  # a missing method or profile leaves those cells empty; it is counted and reported
            self.failures += 1
            return {}
        raise RuntimeError(f"ESPN did not answer for {url}")


# --------------------------------------------------------------------------- ESPN


def venue_of(raw_event: dict) -> dict | None:
    """The venue ESPN gives for the event, or for any of its bouts (some leagues only fill the bouts)."""
    venue = (raw_event.get("venues") or [None])[0]
    if venue:
        return venue
    return next((comp["venue"] for comp in raw_event.get("competitions", []) if comp.get("venue")), None)


def event_day(raw_date: str, venue: dict | None, default_americas: bool) -> date:
    """ESPN dates are UTC; an evening card in the Americas falls on the next UTC day."""
    moment = datetime.strptime(raw_date[:16], "%Y-%m-%dT%H:%M")
    country = ((venue or {}).get("address") or {}).get("country", "")
    in_americas = country in AMERICAS if country else default_americas
    if in_americas and moment.hour < 9:
        moment -= timedelta(days=1)
    return moment.date()


def format_location(venue: dict | None) -> str:
    address = (venue or {}).get("address") or {}
    parts = [address.get("city", ""), address.get("state", "") if address.get("country") in {"USA", "Canada"} else "", address.get("country", "")]
    return ", ".join(part for part in parts if part)


def bout_weight_class(competition: dict) -> str:
    """The division ESPN names for the bout ("W Bantamweight" on some LFA cards), or empty."""
    return map_weight_class((competition.get("type") or {}).get("abbreviation", ""))


def parse_events(payload: dict, league: League) -> list[dict]:
    """Events of a scoreboard answer with their bouts. The main event is first, as on the other organizations' cards."""
    events = []
    for raw in payload.get("events", []):
        venue = venue_of(raw)
        bouts = []
        for comp in raw.get("competitions", []):
            competitors = sorted(comp.get("competitors", []), key=lambda c: c.get("order", 0))
            if len(competitors) != 2 or not all("athlete" in c for c in competitors):
                continue
            names = [c["athlete"]["displayName"] for c in competitors]
            if any("TBA" in name.upper().split() or "TBD" in name.upper().split() for name in names):
                continue
            status = comp.get("status") or {}
            winners = [i for i, c in enumerate(competitors) if c.get("winner")]
            bouts.append(
                {
                    "competition_id": str(comp["id"]),
                    "fighters": [
                        {
                            "id": str(c["id"]),
                            "name": c["athlete"]["displayName"].strip(),
                            "flag": ((c["athlete"].get("flag") or {}).get("alt") or "").strip(),
                            "record": next((r.get("summary", "") for r in c.get("records") or []), ""),
                        }
                        for c in competitors
                    ],
                    "winner_index": winners[0] if winners else None,
                    "completed": bool((status.get("type") or {}).get("completed")),
                    "round": clean_round(status.get("period")),
                    "time": clean_clock(status.get("displayClock") or ""),
                    "weight_class": bout_weight_class(comp),
                }
            )
        if bouts:
            name = ascii_name(raw["name"])
            if league.name_prefix and name.startswith(league.name_prefix):
                name = name[len(league.name_prefix):]
            events.append(
                {
                    "id": str(raw["id"]),
                    "name": name,
                    "day": event_day(raw["date"], venue, league.default_americas),
                    "location": format_location(venue),
                    "bouts": list(reversed(bouts)),  # ESPN lists the prelims first
                }
            )
    return events


# --------------------------------------------------------------------------- assembling


def fight_rows(events: list[dict], methods: dict[str, tuple[str, str]], league: League) -> list[dict]:
    rows = []
    for event in events:
        event_url = EVENT_PAGE_URL.format(event_id=event["id"], league=league.espn)
        for order, bout in enumerate(event["bouts"]):
            method, detail = methods.get(bout["competition_id"], ("", ""))
            winner, outcome = bout_outcome(bout, method)
            one, two = bout["fighters"]
            rows.append(
                {
                    "event_name": event["name"], "event_date": event["day"].isoformat(), "location": event["location"],
                    "event_url": event_url, "event_slug": f"{league.id}-{event['id']}",
                    "circuit": "", "fight_url": f"{event_url}#fight-{bout['competition_id']}",
                    "card_order": order, "fighter_1": one["name"], "fighter_2": two["name"],
                    "fighter_1_url": ATHLETE_PAGE_URL.format(athlete_id=one["id"]), "fighter_2_url": ATHLETE_PAGE_URL.format(athlete_id=two["id"]),
                    "winner": winner, "outcome": outcome, "weight_class": bout["weight_class"], "stage": "", "title_fight": "",
                    "method": method if outcome else "", "method_detail": detail if outcome else "",
                    "round": bout["round"].split(".")[0] if outcome and bout["round"] else "", "time": bout["time"] if outcome else "",
                }
            )
    return rows


def photos_dir(league: League) -> Path:
    return BASE_DIR / "frontend" / "public" / "fighter-photos" / league.id


def attach_local_photos(rows: list[dict], league: League) -> None:
    for row in rows:
        row["image_url"] = f"/fighter-photos/{league.id}/{row['slug']}.webp" if (photos_dir(league) / f"{row['slug']}.webp").exists() else ""


def download_photos(rows: list[dict], league: League, limit: int, delay: float) -> int:
    from scripts.download_fighter_photos import to_webp

    target_dir = photos_dir(league)
    target_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT
    done = 0
    for row in rows:
        target = target_dir / f"{row['slug']}.webp"
        if row["headshot_url"] and not target.exists() and done < limit:
            try:
                time.sleep(delay)
                response = session.get(row["headshot_url"], timeout=TIMEOUT_SECONDS)
                if response.status_code == 404:
                    continue
                response.raise_for_status()
                target.write_bytes(to_webp(response.content, max_width=PHOTO_MAX_WIDTH, method=PHOTO_WEBP_METHOD))
                done += 1
            except Exception as error:  # noqa: BLE001 - a missing photo must not stop the run
                print(f"[warn] photo for {row['name']}: {error}")
    return done


# --------------------------------------------------------------------------- main


def collect(league: League, fetcher: Fetcher, *, dry_run: bool, photos: bool, photo_limit: int, delay: float) -> int:
    output = RAW_DATA_DIR / league.id
    print(f"[info] {league.id}: reading ESPN league '{league.espn}'")
    events: list[dict] = []
    for year in range(league.first_year, date.today().year + 1):
        events += parse_events(fetcher.get(SCOREBOARD_URL.format(league=league.espn), {"dates": f"{year}0101-{year}1231", "limit": 500}), league)
    events.sort(key=lambda event: (event["day"], event["id"]), reverse=True)
    bouts = [(event, bout) for event in events for bout in event["bouts"]]
    print(f"[info] {league.id}: {len(events)} events, {len(bouts)} bouts")
    if not events:
        print(f"[error] {league.id}: no events; files left untouched")
        return 1

    def method_of(item: tuple[dict, dict]) -> tuple[str, tuple[str, str]]:
        event, bout = item
        if not bout["completed"]:
            return bout["competition_id"], ("", "")
        status = fetcher.get(f"{CORE_URL.format(league=league.espn)}/events/{event['id']}/competitions/{bout['competition_id']}/status?lang=en", optional=True)
        return bout["competition_id"], parse_bout_method(status)

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        methods = dict(pool.map(method_of, bouts))
    print(f"[info] {league.id}: {sum(1 for m in methods.values() if m[0])} bouts with a method")

    fighters: dict[str, dict] = {}
    for _, bout in bouts:
        for fighter in bout["fighters"]:
            fighters.setdefault(fighter["id"], fighter)
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        bios = dict(zip(fighters, pool.map(lambda athlete_id: parse_athlete(fetcher.get(ATHLETE_URL.format(athlete_id=athlete_id), optional=True)), fighters)))
    print(f"[info] {league.id}: {len(fighters)} fighters, {sum(1 for b in bios.values() if b)} profiles, {fetcher.failures} answers ESPN never gave")

    fights = fight_rows(events, methods, league)
    ids_by_name = {name_key(info["name"]): athlete_id for athlete_id, info in fighters.items()}
    named = sum(1 for fight in fights if fight["weight_class"])
    filled = fill_weight_classes(fights, bios, ids_by_name)
    spread = propagate_weight_classes(fights)
    print(f"[info] {league.id}: weight class named by ESPN for {named} bouts, from the profiles for {filled}, from the fighters' other bouts for {spread}; {sum(1 for f in fights if not f['weight_class'])} left empty")

    rows = fighter_rows(fighters, bios, fights, date.today().isoformat())
    if photos and not dry_run:
        print(f"[info] {league.id}: photos downloaded: {download_photos(rows, league, photo_limit, delay)}")
    attach_local_photos(rows, league)
    print(f"[info] {league.id}: {len(fights)} bouts, {len(rows)} fighters")
    if dry_run:
        print(f"[dry-run] {league.id}: nothing written")
        return 0
    output.mkdir(parents=True, exist_ok=True)
    save_csv(output / "fights.csv", FIGHT_FIELDS, fights)
    save_csv(output / "fighters.csv", FIGHTER_FIELDS, rows)
    save_csv(output / "rankings.csv", RANKING_FIELDS, [])  # ESPN has no rankings or belts for these leagues
    return 0


RECENT_DAYS = 45


def refresh_rows(league: League, events: list[dict], methods: dict, bios: dict, fighters: dict, stored_fights: list[dict], stored_fighters: list[dict], today: date) -> tuple[list[dict], list[dict], dict]:
    """The files' rows after the events read are put in place of the stored rows of the same events.

    Every other stored row is left as it was. Only the fighters on the refreshed cards are rebuilt, and one whose ESPN profile
    could not be read keeps its stored row (only its dates move), so a bad answer never blanks a good profile."""
    new_fights = fight_rows(events, methods, league)
    ids_by_name = {name_key(info["name"]): athlete_id for athlete_id, info in fighters.items()}
    fill_weight_classes(new_fights, bios, ids_by_name)
    slugs = {f"{league.id}-{event['id']}" for event in events}
    # Bouts scripts/scrape_sherdog_org.py added to a card (a Sherdog address in `fight_url`) stay unless ESPN now has the same bout;
    # the Sherdog refresh that follows this one in update_all puts its own back in order.
    now_on_espn = {(row["event_slug"], frozenset((name_key(row["fighter_1"]), name_key(row["fighter_2"])))) for row in new_fights}
    from_sherdog = [
        row for row in stored_fights
        if row["event_slug"] in slugs and row["fight_url"].startswith(SHERDOG_URL)
        and (row["event_slug"], frozenset((name_key(row["fighter_1"]), name_key(row["fighter_2"])))) not in now_on_espn
    ]
    base = [*[row for row in stored_fights if row["event_slug"] not in slugs], *from_sherdog]
    # The division a fighter usually fights at is counted over the history, but only the new bouts are filled with it.
    propagate_weight_classes([*new_fights, *[row for row in base if row["weight_class"]]])
    combined = sorted([*new_fights, *base], key=lambda row: row["event_date"], reverse=True)  # stable: each card keeps its order

    fought = [row for row in combined if row["outcome"]]  # a card still to come is not a fight the fighter has had
    rebuilt = {name_key(row["name"]): (athlete_id, row) for athlete_id, row in zip(fighters, fighter_rows(fighters, bios, fought, today.isoformat()))}
    existing = {name_key(row["name"]): row for row in stored_fighters}
    taken = {row["slug"] for row in stored_fighters}
    result = [dict(row) for row in stored_fighters]
    positions = {name_key(row["name"]): index for index, row in enumerate(result)}
    dates: dict[str, list[str]] = {}
    for row in fought:
        for side in ("fighter_1", "fighter_2"):
            dates.setdefault(name_key(row[side]), []).append(row["event_date"])
    report = {"new": 0, "updated": 0, "kept": 0}
    for key, (athlete_id, row) in rebuilt.items():
        old = existing.get(key)
        if old is None:
            row["slug"] = row["slug"] if row["slug"] not in taken else f"{row['slug']}-{athlete_id}"
            taken.add(row["slug"])
            result.append(row)
            report["new"] += 1
        elif bios.get(athlete_id):
            row["slug"], row["image_url"] = old["slug"], old["image_url"] or row["image_url"]
            result[positions[key]] = row
            report["updated"] += 1
        else:
            own = sorted(dates.get(key, []))
            if own:
                result[positions[key]].update(first_fight_date=own[0], last_fight_date=own[-1])
            report["kept"] += 1
    result.sort(key=lambda row: ascii_name(row["name"]).lower())
    return combined, result, report


def collect_recent(league: League, fetcher: Fetcher, *, recent_days: int, dry_run: bool) -> int:
    """The daily refresh: the events of the last `recent_days` days and the cards still to come, put in place of the stored ones."""
    folder = RAW_DATA_DIR / league.id
    if not (folder / "fights.csv").exists() or not (folder / "fighters.csv").exists():
        print(f"[error] {league.id}: no files to refresh in {folder}; run it once in full first")
        return 1
    _, stored_fights = load_csv(folder / "fights.csv")
    _, stored_fighters = load_csv(folder / "fighters.csv")
    today = date.today()
    cutoff = today - timedelta(days=recent_days)
    events: list[dict] = []
    for year in range(cutoff.year, today.year + 2):
        events += [event for event in parse_events(fetcher.get(SCOREBOARD_URL.format(league=league.espn), {"dates": f"{year}0101-{year}1231", "limit": 500}), league) if event["day"] >= cutoff]
    events.sort(key=lambda event: (event["day"], event["id"]), reverse=True)
    if not events:
        print(f"[info] {league.id}: no event since {cutoff} and none announced: nothing to update")
        return 0
    bouts = [(event, bout) for event in events for bout in event["bouts"]]
    print(f"[info] {league.id}: {len(events)} events since {cutoff}, {len(bouts)} bouts")

    def method_of(item: tuple[dict, dict]) -> tuple[str, tuple[str, str]]:
        event, bout = item
        if not bout["completed"]:
            return bout["competition_id"], ("", "")
        status = fetcher.get(f"{CORE_URL.format(league=league.espn)}/events/{event['id']}/competitions/{bout['competition_id']}/status?lang=en", optional=True)
        return bout["competition_id"], parse_bout_method(status)

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        methods = dict(pool.map(method_of, bouts))
    fighters: dict[str, dict] = {}
    for _, bout in bouts:
        for fighter in bout["fighters"]:
            fighters.setdefault(fighter["id"], fighter)
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        bios = dict(zip(fighters, pool.map(lambda athlete_id: parse_athlete(fetcher.get(ATHLETE_URL.format(athlete_id=athlete_id), optional=True)), fighters)))
    combined, people, report = refresh_rows(league, events, methods, bios, fighters, stored_fights, stored_fighters, today)
    if len(combined) < len(stored_fights) * 0.98:
        print(f"[error] {league.id}: the refresh would drop rows ({len(stored_fights)} -> {len(combined)}); files left untouched")
        return 1
    print(f"[info] {league.id}: bouts {len(stored_fights)} -> {len(combined)}, fighters {len(stored_fighters)} -> {len(people)} ({report['new']} new, {report['updated']} refreshed, {report['kept']} kept as they were: no profile answer)")
    if dry_run:
        print(f"[dry-run] {league.id}: nothing written")
        return 0
    if combined != stored_fights:
        save_csv(folder / "fights.csv", FIGHT_FIELDS, combined)
    if people != stored_fighters:
        save_csv(folder / "fighters.csv", FIGHTER_FIELDS, people)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("league", choices=[*LEAGUES, "all"])
    parser.add_argument("--dry-run", action="store_true", help="read and report, write nothing")
    parser.add_argument("--photos", action="store_true", help="download headshots as WebP into frontend/public/fighter-photos/<org>")
    parser.add_argument("--limit", type=int, default=5000, help="max photos to download per league in one run")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY_SECONDS)
    parser.add_argument("--cache-dir", type=Path, help="keep every answer here so an interrupted run resumes")
    parser.add_argument("--recent-days", type=int, nargs="?", const=RECENT_DAYS, help=f"the daily refresh: only the last N days (default {RECENT_DAYS}) and the cards to come")
    parser.add_argument("--rewrite-frozen", action="store_true", help="allow a full run of RIZIN or KSW: drops what Sherdog added to their files")
    args = parser.parse_args(argv)

    chosen = [league for league in LEAGUES.values() if not league.frozen] if args.league == "all" else [LEAGUES[args.league]]
    if args.league != "all" and chosen[0].frozen:
        if args.recent_days is not None:  # the daily refresh: nothing to read, Sherdog continues this one
            print(f"[info] {args.league} is frozen (ESPN has nothing recent for it; Sherdog continues it): nothing to refresh here")
            return 0
        if not args.rewrite_frozen:
            print(f"[error] {args.league} is frozen: a full run would drop what scripts/scrape_sherdog_org.py added. Use --rewrite-frozen if that is what you want")
            return 1
    fetcher = Fetcher(args.delay, args.cache_dir)
    status = 0
    for league in chosen:
        if args.recent_days is not None:
            status |= collect_recent(league, fetcher, recent_days=args.recent_days, dry_run=args.dry_run)
        else:
            status |= collect(league, fetcher, dry_run=args.dry_run, photos=args.photos, photo_limit=args.limit, delay=args.delay)
    return status


if __name__ == "__main__":
    sys.exit(main())
