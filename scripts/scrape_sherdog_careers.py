"""The whole professional career of every active UFC fighter, from Sherdog's fighter pages.

The UFC data only has a fighter's UFC bouts. For the profile's "complete record" and career timeline the site had a
hand-made file of 48 stars (data/raw/career_history_cache.json); everyone else showed their UFC record as their whole
career (Navajo Stirling: 7-0 instead of 12-0). Sherdog's fighter page lists every professional bout: opponent, event,
date, method, referee, round and time. Amateur bouts are in a separate table and are left out.

Linking a fighter of ours to a Sherdog page is the risky part (Sherdog has a dozen "Alex Pereira"), so a page is only
accepted when it holds the fighter's UFC bouts as our event cards record them: the same opponent within a day of the
same date, for all of one or two bouts and from three on for all but one and at least LINK_MIN_SHARE of them (Sherdog
knows some opponents by another name). Names match across accents, word order and run-on Chinese names ("Aoriqileng" is
"Qileng Aori" there). A fighter with no UFC bout
yet cannot be checked and is not linked. Where the link comes from:
    1. the page found by an earlier run (data/raw/sherdog_careers.json keeps it);
    2. an opponent's page: next to each bout Sherdog links the opponent's page, and our cards say who that opponent was;
    3. Sherdog's fight finder: the name, its words the other way round, a run-on name split, then the other spellings in
       name_aliases.csv (exact name first, then close spellings);
    4. when the finder has nobody by any of those names, or only someone else (the UFC bills some fighters by a nickname):
       an already linked UFC opponent's page, through its link next to the bout they had.
Fighters that could not be linked are listed in data/raw/sherdog_careers_unmatched.csv with the reason, for review.

What a Sherdog fighter page does NOT give, and stays empty rather than guessed: the location and weight class of a bout,
and title-fight flags outside the UFC. For UFC bouts the site uses its own event cards instead (fight_history_service
merges them by date). The organization of a non-UFC bout is read from the event's name ("LFA 150 - ..." is LFA).

The hand-made career_history_cache.json is never touched and wins over this file for the fighters it has.

Usage (from the repo root):
    python -m scripts.scrape_sherdog_careers                     # every active fighter not linked yet (about 25 minutes the first time)
    python -m scripts.scrape_sherdog_careers --recent-days 10    # the daily refresh: who fought lately, and new fighters
    python -m scripts.scrape_sherdog_careers --name "Navajo Stirling" --dry-run
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
import unicodedata
from datetime import date, datetime, timedelta
from difflib import SequenceMatcher
from itertools import permutations
from pathlib import Path
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.scrape_espn import NON_DECOMPOSING
from scripts.scrape_oktagon import Fetcher
from scripts.scrape_sherdog_org import USER_AGENT

BASE_URL = "https://www.sherdog.com"
OUTPUT_PATH = Path("data") / "raw" / "sherdog_careers.json"
UNMATCHED_PATH = Path("data") / "raw" / "sherdog_careers_unmatched.csv"
CARDS_PATH = Path("data") / "raw" / "event_cards.csv"
ALIASES_PATH = Path("data") / "raw" / "name_aliases.csv"
UNMATCHED_FIELDS = ["name", "reason", "candidates", "checked"]
REQUEST_DELAY_SECONDS = 1.0
LINK_MIN_SHARE = 0.8
NAME_MIN_RATIO = 0.8
SEARCH_MIN_RATIO = 0.85
MAX_CANDIDATES = 3
OPPONENT_PAGES = 2
# A fighter Sherdog could not be linked for is asked again after this many days (a debut adds a bout to check against).
RETRY_UNMATCHED_DAYS = 7
RESULTS = {"win": "win", "loss": "loss", "draw": "draw", "nc": "nc"}


# --------------------------------------------------------------------------- names


def fold(name: str | None) -> str:
    """Name key: no accents, case or punctuation ("Jan Błachowicz" == "jan blachowicz")."""
    text = "".join(NON_DECOMPOSING.get(char, char) for char in str(name or ""))
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text.lower()).split())


def same_name(a: str | None, b: str | None) -> bool:
    fa, fb = fold(a), fold(b)
    if not fa or not fb:
        return False
    if fa == fb or sorted(fa.split()) == sorted(fb.split()):
        return True
    # Chinese names: the UFC writes "Aoriqileng" and "Yizha", Sherdog "Qileng Aori" and "Zha Yi" ("DongHun"/"Dong Hun" too).
    words = fb.split()
    if len(words) <= 4 and fa.replace(" ", "") in {"".join(order) for order in permutations(words)}:
        return True
    return SequenceMatcher(None, fa, fb).ratio() >= NAME_MIN_RATIO


def search_names(name: str, aliases: list[str] | tuple[str, ...] = ()) -> list[str]:
    """What to ask the fight finder, in order: the name, its words the other way round ("Shi Ming" / "Ming Shi"), a run-on
    name split ("DongHun Choi" / "Dong Hun Choi"), and the other spellings in name_aliases.csv."""
    names = [name]
    words = name.split()
    if 2 <= len(words) <= 3:
        names.append(" ".join(reversed(words)))
    split = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", name)
    if split != name:
        names.append(split)
    names.extend(aliases)
    unique: list[str] = []
    for candidate in names:
        if fold(candidate) not in [fold(seen) for seen in unique]:
            unique.append(candidate)
    return unique


# --------------------------------------------------------------------------- parsing


def _day(text: str) -> str | None:
    try:
        return datetime.strptime(re.sub(r"\s+", "", text), "%b/%d/%Y").date().isoformat()
    except ValueError:
        return None


def organization_of(event_name: str) -> tuple[str, bool]:
    """(organization, is UFC) from a Sherdog event name: "LFA 150 - A vs. B" is LFA, "HFS - Hex Fight Series 31" is Hex Fight Series."""
    event_name = event_name.strip().rstrip("-:, ").strip() or event_name  # "BrazilMMA -": an event Sherdog names with nothing after the dash
    left, _, right = (part.strip() for part in event_name.partition(" - "))

    def strip_number(text: str) -> str:
        words = text.split()
        while len(words) > 1 and re.fullmatch(r"[\d:.#]+|\d+[a-z]{0,2}", words[-1], flags=re.IGNORECASE):
            words.pop()
        return " ".join(words)

    left = strip_number(left)
    # Road to UFC is the UFC's tournament for Asian prospects: its bouts are not UFC bouts, but its finals are held on
    # UFC cards and count. "UFC Venezuela" is a regional promoter.
    if re.search(r"\bRoad to UFC\b", event_name) and not re.search(r"\bFinals?\b", event_name):
        return "Road to UFC", False
    if re.match(r"UFC Venezuela\b", left):
        return left, False
    if re.match(r"UFC\b", left) or re.match(r"The Ultimate Fighter\b.*\bFinale\b", event_name):
        return "UFC", True
    # "FCC 27 - Full Contact Contender 27": the right side spells the acronym out. "ACB 70 - Sheffield" does not (a city).
    if right and re.fullmatch(r"[A-Z0-9&]{2,6}", left):
        right = strip_number(right)
        if right and _initials(right) == left.replace("&", ""):
            return right, False
    return left or event_name, False


def _initials(text: str) -> str:
    """"UK Fighting Championships" -> "UKFC", "FightStar Championship" -> "FSC"."""
    letters = ""
    for word in re.findall(r"[A-Za-z0-9]+", text):
        letters += word if word.isupper() else "".join(char for char in word if char.isupper()) or word[0].upper()
    return letters


def parse_fighter_page(html: str) -> dict:
    """The fighter's name, Sherdog address and professional bouts (oldest first). Bouts still to come are left out."""
    soup = BeautifulSoup(html, "html.parser")
    name_el = soup.select_one("span.fn")
    url_el = soup.select_one('meta[property="og:url"]')
    url = (url_el.get("content") or "") if url_el else ""
    url = "https:" + url if url.startswith("//") else url
    fights: list[dict] = []
    for table in soup.select(".module.fight_history"):
        heading = table.find_previous_sibling()
        if heading is None or heading.get_text(" ", strip=True).upper() != "FIGHT HISTORY - PRO":
            continue
        for row in table.select("tr"):
            if "table_head" in (row.get("class") or []):
                continue
            cells = row.select("td")
            if len(cells) < 6:
                continue
            result = RESULTS.get(cells[0].get_text(strip=True).lower())
            opponent = cells[1].select_one("a")
            event_link = cells[2].select_one("a")
            event_date = cells[2].select_one(".sub_line")
            if result is None or opponent is None or event_link is None or event_date is None:
                continue
            method = cells[3].select_one("b")
            referee = cells[3].select_one(".sub_line a")
            round_text = cells[4].get_text(strip=True)
            event_name = event_link.get_text(" ", strip=True)
            organization, is_ufc = organization_of(event_name)
            fights.append(
                {
                    "result": result,
                    "opponent": opponent.get_text(" ", strip=True),
                    "opponent_url": BASE_URL + opponent["href"] if opponent.get("href", "").startswith("/") else None,
                    "event_name": event_name,
                    "date": _day(event_date.get_text(" ", strip=True)),
                    "method": method.get_text(" ", strip=True) if method else None,
                    "referee": referee.get_text(" ", strip=True) if referee else None,
                    "round": int(round_text) if round_text.isdigit() else None,
                    "time": cells[5].get_text(strip=True) or None,
                    "organization": organization,
                    "is_ufc": is_ufc,
                }
            )
    fights.sort(key=lambda fight: fight["date"] or "")  # Sherdog lists the newest first
    return {"name": name_el.get_text(" ", strip=True) if name_el else None, "url": url, "fights": fights}


def search_candidates(html: str) -> list[tuple[str, str]]:
    """(name, address) of every fighter the fight finder lists."""
    soup = BeautifulSoup(html, "html.parser")
    found: list[tuple[str, str]] = []
    for row in soup.select(".fightfinder_result tr"):
        link = row.select_one('a[href^="/fighter/"]')
        if link is None:
            continue
        cells = row.select("td")
        name = " ".join(cells[1].get_text(" ", strip=True).split()) if len(cells) > 1 else link.get_text(" ", strip=True)
        url = BASE_URL + link["href"]
        if url not in [address for _, address in found]:
            found.append((name, url))
    return found


def ranked_candidates(name: str, candidates: list[tuple[str, str]]) -> list[str]:
    """The addresses worth opening for `name`: the exact spelling first, then close ones, at most MAX_CANDIDATES."""
    key = fold(name)
    exact = [url for found, url in candidates if fold(found) == key]
    close = sorted(
        ((SequenceMatcher(None, key, fold(found)).ratio(), url) for found, url in candidates if fold(found) != key),
        reverse=True,
    )
    return (exact + [url for ratio, url in close if ratio >= SEARCH_MIN_RATIO])[:MAX_CANDIDATES]


# --------------------------------------------------------------------------- linking


def _within_a_day(a: str | None, b: str | None) -> bool:
    try:
        return abs((date.fromisoformat(a) - date.fromisoformat(b)).days) <= 1  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return False


def _share_a_name(a: str | None, b: str | None) -> bool:
    """ "Patricio Pitbull" and "Patricio Freire": the UFC bills some fighters by a nickname Sherdog does not use."""
    return bool({word for word in fold(a).split() if len(word) >= 3} & {word for word in fold(b).split() if len(word) >= 3})


def matching_bout(ufc_fight: dict, sherdog_fights: list[dict]) -> dict | None:
    """The page's bout that is this UFC bout: within a day of it, against the same opponent. A UFC bout on Sherdog whose
    opponent only shares a name with ours (a nickname on one side) counts too: nobody is on two UFC cards a day apart."""
    for fight in sherdog_fights:
        if not _within_a_day(ufc_fight.get("date"), fight["date"]):
            continue
        if same_name(ufc_fight.get("opponent"), fight["opponent"]) or (fight["is_ufc"] and _share_a_name(ufc_fight.get("opponent"), fight["opponent"])):
            return fight
    return None


def verify(ufc_fights: list[dict], sherdog_fights: list[dict]) -> tuple[bool, int]:
    """(is it the same fighter, how many of our UFC bouts the page has)."""
    if not ufc_fights:
        return False, 0
    matched = sum(1 for fight in ufc_fights if matching_bout(fight, sherdog_fights))
    return matched >= required_matches(len(ufc_fights)), matched


def required_matches(bouts: int) -> int:
    """All of one or two UFC bouts; from three on, one may be missed (an opponent Sherdog knows by another name: Loma
    Lookboonmee is Konklak Suphisara there), and at least LINK_MIN_SHARE of them."""
    if bouts <= 2:
        return max(1, bouts)
    return min(bouts - 1, math.ceil(LINK_MIN_SHARE * bouts))


def _record(fights: list[dict]) -> dict:
    counts = {result: sum(1 for fight in fights if fight["result"] == result) for result in RESULTS.values()}
    total = len(fights)
    return {
        "total": total, "wins": counts["win"], "losses": counts["loss"], "draws": counts["draw"], "nc": counts["nc"],
        "win_rate": round(counts["win"] / total * 100) if total else 0,
    }


def career_entry(name: str, page: dict, today: str) -> dict:
    """The page in the format of career_history_cache.json (see career_fights_service), plus where it came from."""
    fights = [
        {
            "event_name": fight["event_name"], "date": fight["date"], "year": int(fight["date"][:4]) if fight["date"] else None,
            "opponent": fight["opponent"], "result": fight["result"], "method": fight["method"], "round": fight["round"],
            "time": fight["time"], "referee": fight["referee"], "organization": fight["organization"], "is_ufc": fight["is_ufc"],
            "outcome": fight["result"] if fight["result"] in ("win", "loss") else None,
        }
        for fight in page["fights"]
    ]
    return {
        "fighter": name,
        "sherdog_url": page["url"],
        "checked": today,
        "ufc_record": _record([fight for fight in fights if fight["is_ufc"]]),
        "complete_record": _record(fights),
        "organizations": sorted({fight["organization"] for fight in fights}),
        "fights": fights,
    }


def opponent_links(ufc_fights: list[dict], page: dict) -> dict[str, str]:
    """Our name of each UFC opponent -> their Sherdog page, read off a page already linked to one of ours."""
    links: dict[str, str] = {}
    for fight in ufc_fights:
        bout = matching_bout(fight, page["fights"])
        if bout and bout["opponent_url"]:
            links[fold(fight["opponent"])] = bout["opponent_url"]
    return links


# --------------------------------------------------------------------------- run


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_unmatched(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8") as handle:
        return {row["name"]: row for row in csv.DictReader(handle)}


def save(careers: dict, unmatched: dict[str, dict], output: Path, unmatched_output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        # One fighter per line: a refresh changes a handful of lines, not the whole file.
        handle.write("{\n")
        names = sorted(careers)
        for index, name in enumerate(names):
            line = json.dumps(name, ensure_ascii=False) + ": " + json.dumps(careers[name], ensure_ascii=False, separators=(",", ":"))
            handle.write(line + ("," if index < len(names) - 1 else "") + "\n")
        handle.write("}\n")
    with unmatched_output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=UNMATCHED_FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(unmatched[name] for name in sorted(unmatched))


def recent_fighters(days: int, today: date) -> set[str]:
    """Names on the UFC cards of the last `days` days."""
    since = today - timedelta(days=days)
    names: set[str] = set()
    with CARDS_PATH.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            try:
                day = datetime.strptime(row["event_date"], "%B %d, %Y").date()
            except ValueError:
                continue
            if day >= since:
                names.update(name for name in (row["fighter_1"], row["fighter_2"]) if name)
    return names


class CareerLinker:
    def __init__(self, fetcher: Fetcher, careers: dict, ufc_fights_of, today: str, aliases: dict[str, list[str]] | None = None) -> None:
        self.fetcher = fetcher
        self.aliases = aliases or {}
        self.careers = careers
        self.ufc_fights_of = ufc_fights_of
        self.today = today
        self.discovered: dict[str, str] = {}
        self.careers_by_key = {fold(name): entry for name, entry in careers.items()}
        for name, entry in careers.items():
            self.discovered.setdefault(fold(name), entry["sherdog_url"])

    def read_page(self, url: str) -> dict | None:
        html = self.fetcher.get(url)
        return parse_fighter_page(html) if html else None

    def first_verified(self, name: str, ufc_fights: list[dict], candidates: list[str], tried: list[str]) -> dict | None:
        for url in candidates:
            page = self.read_page(url)
            tried.append(url)
            if not page:
                continue
            ok, _ = verify(ufc_fights, page["fights"])
            if ok:
                for opponent, address in opponent_links(ufc_fights, page).items():
                    self.discovered.setdefault(opponent, address)
                return career_entry(name, page, self.today)
        return None

    def through_opponents(self, name: str, ufc_fights: list[dict]) -> list[str]:
        """The fighter's page as linked from an already linked UFC opponent's page (the fight finder does not know
        "Renato Moicano": Sherdog has him as Renato Carneiro). Reads at most OPPONENT_PAGES pages."""
        found: list[str] = []
        read = 0
        for fight in ufc_fights:
            opponent = self.careers_by_key.get(fold(fight.get("opponent")))
            if not opponent or read >= OPPONENT_PAGES:
                continue
            page = self.read_page(opponent["sherdog_url"])
            read += 1
            for bout in (page or {}).get("fights", []):
                if bout["is_ufc"] and _within_a_day(fight.get("date"), bout["date"]) and bout["opponent_url"] and bout["opponent_url"] not in found:
                    found.append(bout["opponent_url"])
            if found:
                break
        return found

    def link(self, name: str) -> tuple[dict | None, str, list[str]]:
        """(career entry or None, why not, addresses tried) for one of our fighters."""
        ufc_fights = self.ufc_fights_of(name)
        if not ufc_fights:
            return None, "no UFC bout yet to check a Sherdog page against", []
        known = self.discovered.get(fold(name))
        tried: list[str] = []
        if known:
            entry = self.first_verified(name, ufc_fights, [known], tried)
            if entry or not tried:
                return entry, "" if entry else "the linked page could not be read", tried
        found_anyone = False
        for query in search_names(name, self.aliases.get(name, ())):
            html = self.fetcher.get(f"{BASE_URL}/stats/fightfinder?SearchTxt={quote_plus(fold(query))}")
            candidates = [url for url in ranked_candidates(query, search_candidates(html or "")) if url not in tried]
            found_anyone = found_anyone or bool(candidates)
            entry = self.first_verified(name, ufc_fights, candidates, tried)
            if entry:
                return entry, "", tried
        # The finder found nobody, or only someone else of that name (a Jose Montanha who fought in 2010).
        extra = [url for url in self.through_opponents(name, ufc_fights) if url not in tried]
        entry = self.first_verified(name, ufc_fights, extra, tried)
        if entry:
            return entry, "", tried
        reason = "no Sherdog page holds the UFC bouts" if found_anyone or extra else "the fight finder has no fighter by that name"
        return None, reason, tried


def load_aliases(path: Path = ALIASES_PATH) -> dict[str, list[str]]:
    """Catalog name -> the other spellings name_aliases.csv lists for it."""
    if not path.exists():
        return {}
    aliases: dict[str, list[str]] = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            aliases.setdefault(row["canonical"], []).append(row["alias"])
    return aliases


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--recent-days", type=int, help="only fighters on the cards of the last N days, and active fighters not linked yet")
    parser.add_argument("--name", action="append", help="only this fighter (repeatable)")
    parser.add_argument("--limit", type=int, help="stop after this many fighters")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY_SECONDS)
    parser.add_argument("--dry-run", action="store_true", help="print what would change; write nothing")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--unmatched-output", type=Path, default=UNMATCHED_PATH)
    args = parser.parse_args(argv)

    from backend.app.services.catalog_service import list_fighters
    from backend.app.services.fight_history_service import get_fights_for_fighter

    today = date.today()
    careers = load_json(args.output)
    unmatched = load_unmatched(args.unmatched_output)
    active = sorted(f["name"] for f in list_fighters(ufc_only=True) if f.get("ufc_status") == "active")
    if args.name:
        todo = list(args.name)
    else:
        retry_before = (today - timedelta(days=RETRY_UNMATCHED_DAYS)).isoformat()
        fresh = recent_fighters(args.recent_days, today) if args.recent_days else set(active)
        todo = [
            name for name in active
            if (name in fresh and (args.recent_days or name not in careers))
            or (name not in careers and (name not in unmatched or unmatched[name]["checked"] < retry_before))
        ]
    if args.limit:
        todo = todo[: args.limit]
    print(f"[info] {len(todo)} fighters to read on Sherdog ({len(careers)} linked so far, {len(active)} active)")

    def ufc_fights_of(name: str) -> list[dict]:
        return [{"date": fight.get("date"), "opponent": fight.get("opponent")} for fight in get_fights_for_fighter(name)]

    linker = CareerLinker(Fetcher(args.delay, user_agent=USER_AGENT), careers, ufc_fights_of, today.isoformat(), load_aliases())
    # Fighters whose page is already known (an earlier run, or an opponent's page read in this one) go first, so the fight
    # finder is used as little as possible.
    pending = list(todo)
    linked = failed = 0
    done = 0
    while pending:
        pending.sort(key=lambda name: fold(name) not in linker.discovered)
        name = pending.pop(0)
        try:
            entry, reason, tried = linker.link(name)
        except RuntimeError as error:
            entry, reason, tried = None, f"Sherdog did not answer: {error}", []
        if entry:
            before = careers.get(name, {}).get("complete_record")
            careers[name] = entry
            linker.careers_by_key[fold(name)] = entry
            unmatched.pop(name, None)
            linked += 1
            if before != entry["complete_record"]:
                record = entry["complete_record"]
                print(f"  + {name}: {record['wins']}-{record['losses']}-{record['draws']} ({len(entry['fights'])} bouts, {', '.join(entry['organizations'])})")
        else:
            unmatched[name] = {"name": name, "reason": reason, "candidates": " ".join(tried), "checked": today.isoformat()}
            failed += 1
            print(f"  ? {name}: {reason}")
        done += 1
        if done % 50 == 0:
            print(f"  [{done}/{len(todo)}] linked {linked}, not linked {failed}")
            if not args.dry_run:
                save(careers, unmatched, args.output, args.unmatched_output)  # a long first run keeps what it has
    print(f"[info] Sherdog careers: {linked} linked, {failed} not linked; {len(careers)} fighters in {args.output}")
    if not args.dry_run:
        save(careers, unmatched, args.output, args.unmatched_output)
    return 0 if linked or not todo else 1


if __name__ == "__main__":
    raise SystemExit(main())
