"""Refresh the career striking and grappling numbers of fighters who fought recently, from the ufc.com athlete page.

ufcstats.com used to be the source of data/raw/fighter_career_stats.csv, but it fronts every page with a bot challenge and
the project does not get around it (see scripts/scrape_espn.py). The athlete page on ufc.com shows the same career
numbers. This script only touches the fighters whose numbers can have changed:

- fighters with a fight in the last --days days (a fight moves every one of these numbers);
- fighters created from ESPN, whose row was never filled from ufcstats (their url is not a ufcstats one).

What it writes, per fighter, into the row that already exists: sig_str_acc, str_def, slpm, sapm, td_avg, td_def, sub_avg.
It never touches takedown_acc (ufc.com's figure disagrees with ufcstats': 0% against 26% for a fighter with 15
attempts), dob, wins, losses or draws (those come from ufcstats history and from ESPN).

ufc.com's robots.txt asks for a 15 second delay between requests and allows the athlete pages, so a run is capped by
--limit (default 40, about ten minutes). The page is served in Portuguese whatever the request says, so the numbers are
read by their place in the page, not by their label; a page that does not have the expected shape is skipped, and so is
a page whose heading is not the fighter's name (two fighters can share a name).

Usage (from the repo root):
    python -m scripts.scrape_ufc_career_stats --dry-run
    python -m scripts.scrape_ufc_career_stats
    python -m scripts.scrape_ufc_career_stats --days 60 --limit 100
"""

from __future__ import annotations

import argparse
import re
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.download_fighter_photos import slugify
from scripts.scrape_espn import load_csv, name_key, parse_day, save_csv
from src.ufc_predictor.config import RAW_DATA_DIR

UFC_ATHLETE_URL = "https://www.ufc.com/athlete/{slug}"
HEADERS = {"User-Agent": "ufcpredictor/1.0 (personal project; reads public athlete pages)", "Accept-Language": "en-US,en;q=0.9"}
# robots.txt: "Crawl-delay: 15"
CRAWL_DELAY_SECONDS = 15.0
TIMEOUT_SECONDS = 30
RECENT_DAYS = 30
DEFAULT_LIMIT = 40

FIGHTERS_PATH = RAW_DATA_DIR / "fighters.csv"
CARDS_PATH = RAW_DATA_DIR / "event_cards.csv"
CAREER_PATH = RAW_DATA_DIR / "fighter_career_stats.csv"

# The eight blocks of the stats section, in page order: number first, then its label (in Portuguese).
GROUP_FIELDS = ["slpm", "sapm", "td_avg", "sub_avg", "str_def", "td_def", "kd_avg", "avg_fight_time"]
WRITTEN_FIELDS = ["sig_str_acc", "str_def", "slpm", "sapm", "td_avg", "td_def", "sub_avg"]
PERCENT_FIELDS = {"sig_str_acc", "str_def", "td_def"}
# A bound no real fighter gets near: a page that says otherwise was read wrongly.
MAX_PER_MINUTE = 25.0
MAX_PER_15_MIN = 25.0


def decode_page(content: bytes) -> str:
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        return content.decode("latin-1")


def _percent(text: str) -> str | None:
    match = re.fullmatch(r"\s*(\d{1,3})\s*%\s*", text or "")
    return f"{int(match.group(1))}%" if match and int(match.group(1)) <= 100 else None


def _number(text: str, limit: float) -> str | None:
    match = re.fullmatch(r"\s*(\d+(?:[.,]\d+)?)\s*", text or "")
    if not match:
        return None
    value = float(match.group(1).replace(",", "."))
    return f"{value:.2f}" if value <= limit else None


def parse_athlete_page(html: str, name: str) -> dict | None:
    """The seven numbers of an ufc.com athlete page, or None when the page is for someone else or has no stats."""
    soup = BeautifulSoup(html, "html.parser")
    heading = soup.find("h1")
    if heading is None or name_key(heading.get_text(" ", strip=True)) != name_key(name):
        return None
    groups = [group.select_one(".c-stat-compare__number") for group in soup.select(".c-stat-compare__group")]
    numbers = [node.get_text(" ", strip=True) for node in groups if node is not None]
    circles = [node.get_text(strip=True) for node in soup.select("text.e-chart-circle__percent")]
    if len(numbers) != len(GROUP_FIELDS) or not circles:
        return None  # no UFC fight yet, or a layout this script does not know
    raw = dict(zip(GROUP_FIELDS, numbers))
    stats = {
        "sig_str_acc": _percent(circles[0]),  # the first circle is striking accuracy, the second takedown accuracy
        "str_def": _percent(raw["str_def"]),
        "td_def": _percent(raw["td_def"]),
        "slpm": _number(raw["slpm"], MAX_PER_MINUTE),
        "sapm": _number(raw["sapm"], MAX_PER_MINUTE),
        "td_avg": _number(raw["td_avg"], MAX_PER_15_MIN),
        "sub_avg": _number(raw["sub_avg"], MAX_PER_15_MIN),
    }
    return stats if all(value is not None for value in stats.values()) else None


# --------------------------------------------------------------------------- who to refresh


def fighter_name(row: dict) -> str:
    return f"{row.get('first_name', '')} {row.get('last_name', '')}".strip()


def recent_fighters(cards: list[dict], since: date) -> dict[str, date]:
    """name_key -> day of the latest fight, for every fighter on a card since `since`."""
    latest: dict[str, date] = {}
    for row in cards:
        day = parse_day(row.get("event_date", ""))
        if day is None or day < since or not row.get("fighter_1"):
            continue
        for side in ("fighter_1", "fighter_2"):
            key = name_key(row.get(side, ""))
            if key and (key not in latest or day > latest[key]):
                latest[key] = day
    return latest


def is_ufcstats_url(url: str) -> bool:
    return "ufcstats.com" in (url or "")


def pick_targets(fighters: list[dict], recent: dict[str, date], limit: int) -> list[tuple[str, str]]:
    """(name, fighter_url) to read: the most recent fighters first, then those that never had ufcstats numbers."""
    seen: set[str] = set()
    wanted: list[tuple[date, str, str]] = []
    for row in fighters:
        name, url = fighter_name(row), row.get("fighter_url", "")
        key = name_key(name)
        if not name or not url or url in seen:
            continue
        if key in recent:
            wanted.append((recent[key], name, url))
            seen.add(url)
        elif not is_ufcstats_url(url):
            wanted.append((date.min, name, url))
            seen.add(url)
    wanted.sort(key=lambda item: item[0], reverse=True)
    return [(name, url) for _, name, url in wanted[:limit]]


def _same_value(old: str | None, new: str) -> bool:
    """'0.0' and '0.00', or '57%' and '57 %', are the same number: only a different number counts as a change."""
    try:
        return float((old or "").replace("%", "").strip()) == float(new.replace("%", ""))
    except ValueError:
        return False


def update_row(row: dict, stats: dict) -> bool:
    """Write the seven numbers into an existing career row. Anything else in the row is left alone."""
    changed = False
    for field in WRITTEN_FIELDS:
        if not _same_value(row.get(field), stats[field]):
            row[field] = stats[field]
            changed = True
    return changed


# --------------------------------------------------------------------------- network


class Throttle:
    """One request at a time, at least `delay` seconds apart, as the site's robots.txt asks."""

    def __init__(self, delay: float = CRAWL_DELAY_SECONDS) -> None:
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.last = 0.0

    def get(self, url: str) -> str | None:
        wait = self.last + self.delay - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        try:
            response = self.session.get(url, timeout=TIMEOUT_SECONDS)
        finally:
            self.last = time.monotonic()
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return decode_page(response.content)


# --------------------------------------------------------------------------- main


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--days", type=int, default=RECENT_DAYS, help=f"fighters with a fight in the last N days (default {RECENT_DAYS})")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT, help=f"most fighters to read in one run (default {DEFAULT_LIMIT}; 15 s each)")
    parser.add_argument("--dry-run", action="store_true", help="read the pages and report, write nothing")
    args = parser.parse_args(argv)

    if not (FIGHTERS_PATH.exists() and CAREER_PATH.exists()):
        print("[error] fighters.csv or fighter_career_stats.csv is missing")
        return 1
    fighters = load_csv(FIGHTERS_PATH)[1]
    header, career = load_csv(CAREER_PATH)
    cards = load_csv(CARDS_PATH)[1] if CARDS_PATH.exists() else []
    by_url = {row["fighter_url"]: row for row in career}

    recent = recent_fighters(cards, date.today() - timedelta(days=args.days))
    targets = [(name, url) for name, url in pick_targets(fighters, recent, args.limit) if url in by_url]
    print(f"[info] {len(recent)} fighters fought in the last {args.days} days; reading {len(targets)} ufc.com pages (about {len(targets) * CRAWL_DELAY_SECONDS / 60:.0f} min)")

    client = Throttle()
    updated = unchanged = 0
    skipped: list[str] = []
    for index, (name, url) in enumerate(targets, 1):
        try:
            page = client.get(UFC_ATHLETE_URL.format(slug=slugify(name)))
        except requests.RequestException as error:
            skipped.append(f"{name}: {error}")
            continue
        stats = parse_athlete_page(page, name) if page else None
        if stats is None:
            skipped.append(f"{name}: no usable page")
            continue
        if update_row(by_url[url], stats):
            updated += 1
            print(f"  ~ {name}: {stats['slpm']} landed/min, {stats['sig_str_acc']} accuracy, {stats['str_def']} defense")
        else:
            unchanged += 1
        if index % 10 == 0:
            print(f"  [{index}/{len(targets)}]", flush=True)
    print(f"[info] updated: {updated} | already current: {unchanged} | skipped: {len(skipped)}")
    for item in skipped[:15]:
        print(f"  ! {item}")
    if not targets:
        print("[info] nothing to refresh")
        return 0
    if updated == 0 and skipped and len(skipped) == len(targets):
        print("[error] no page could be read; the file was left untouched")
        return 1
    if args.dry_run:
        print("[dry-run] nothing written")
        return 0
    if updated:
        save_csv(CAREER_PATH, header, career)
        print(f"[info] {CAREER_PATH.name} updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
