"""Scrape the official UFC divisional and pound-for-pound rankings.

ufc.com/rankings server-renders the "Media Panel" rankings (the traditional,
widely-cited UFC rankings) directly in the page HTML alongside an
experimental "Meta" ranking tab. We keep the first 13 groupings on the page,
which are the complete Media Panel set: Men's P4P, the 8 men's divisions,
Women's P4P, and the 3 standing women's divisions (UFC does not maintain a
women's featherweight ranking beyond the champion).

No auth, no bot-challenge, no pagination — one request gets everything.
Not resumable/incremental like the other scrapers because a full re-run
takes seconds, not hours; just re-run it whenever rankings need refreshing.
"""

from __future__ import annotations

import csv
import unicodedata
from pathlib import Path

from bs4 import BeautifulSoup

from scripts.http_retry import get_with_retry
from scripts.scrape_espn import NON_DECOMPOSING

RANKINGS_URL = "https://www.ufc.com/rankings"
OUTPUT_PATH = Path("data") / "raw" / "rankings.csv"
STATUS_OVERRIDES_PATH = Path("data") / "raw" / "status_overrides.csv"
TIMEOUT_SECONDS = 20

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}

# Official Media Panel set: P4P groups first, then divisions.
GROUPS_EXPECTED = 13

DIVISION_LABELS = {
    "Peso-mosca": "Flyweight",
    "Peso-galo": "Bantamweight",
    "Peso-pena": "Featherweight",
    "Peso-leve": "Lightweight",
    "Peso Meio-Médio": "Welterweight",
    "Peso-médio": "Middleweight",
    "Peso meio-pesado": "Light Heavyweight",
    "Peso-pesado": "Heavyweight",
    "Peso-palha feminino": "Women's Strawweight",
    "Peso-mosca feminino": "Women's Flyweight",
    "Peso-galo feminino": "Women's Bantamweight",
    "Peso-pena feminino": "Women's Featherweight",
}
# ufc.com serves the page in the visitor's region language: from some networks it comes in English.
DIVISION_LABELS.update({label: label for label in list(DIVISION_LABELS.values())})

RANK_CHANGE_LABELS = {
    "Subiu": "up",
    "Desceu": "down",
    "Nova entrada": "new",
    "Sem mudança": None,
    "Rank increased": "up",
    "Rank decreased": "down",
    "NR": "new",
}

OUTPUT_FIELDS = ["category", "is_p4p", "rank", "fighter", "rank_change", "athlete_url"]


def fetch_rankings_html() -> str:
    response = get_with_retry(RANKINGS_URL, headers=HEADERS, timeout=TIMEOUT_SECONDS)
    response.encoding = "utf-8"
    return response.text


def classify_header(raw_header: str) -> tuple[str, bool] | None:
    header = raw_header.strip()
    if "Top Rank" in header:
        prefix = header.replace("Top Rank", "").strip()
        label = "Pound-for-Pound (Men's)" if prefix.lower().startswith("men") else "Pound-for-Pound (Women's)"
        return label, True

    label = DIVISION_LABELS.get(header)
    if label is None:
        return None
    return label, False


def clean_athlete_url(href: str | None) -> str | None:
    """ufc.com sometimes prefixes its links with "/index%2ephp" (an escaped "/index.php"); keep the plain path."""
    if not href:
        return None
    for prefix in ("/index%2ephp", "/index%2Ephp", "/index.php"):
        if href.startswith(prefix + "/"):
            return href[len(prefix):]
    return href


def parse_rank_change(cell_text: str) -> str | None:
    text = cell_text.strip()
    if not text:
        return None
    for prefix, label in RANK_CHANGE_LABELS.items():
        if text.startswith(prefix):
            return label
    return text or None


def parse_rankings(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    groups = soup.select(".view-grouping")[:GROUPS_EXPECTED]

    records: list[dict] = []
    for group in groups:
        header_el = group.select_one(".view-grouping-header")
        if header_el is None:
            continue
        classified = classify_header(header_el.get_text(strip=True))
        if classified is None:
            continue
        category, is_p4p = classified

        # P4P groups show the #1 P4P fighter as both a "champion" hero card
        # and row 1 of the table (there's no title at stake in P4P) — skip
        # the hero-card record there so the fighter isn't listed twice.
        champion_link = None if is_p4p else group.select_one(".rankings--athlete--champion h5 a")
        if champion_link is not None:
            records.append(
                {
                    "category": category,
                    "is_p4p": is_p4p,
                    "rank": 0,
                    "fighter": champion_link.get_text(strip=True),
                    "rank_change": None,
                    "athlete_url": clean_athlete_url(champion_link.get("href")),
                }
            )

        for row in group.select("tbody tr"):
            cells = row.select("td")
            if len(cells) < 2:
                continue
            rank_text = cells[0].get_text(strip=True)
            if not rank_text.isdigit():
                continue
            fighter_link = cells[1].select_one("a")
            fighter_name = fighter_link.get_text(strip=True) if fighter_link else cells[1].get_text(strip=True)
            # The English page writes "Błachowicz": letters like "ł" have no plain form the name matching can find.
            fighter_name = "".join(NON_DECOMPOSING.get(char, char) for char in fighter_name)
            rank_change = parse_rank_change(cells[2].get_text(" ", strip=True)) if len(cells) > 2 else None

            records.append(
                {
                    "category": category,
                    "is_p4p": is_p4p,
                    "rank": int(rank_text),
                    "fighter": fighter_name,
                    "rank_change": rank_change,
                    "athlete_url": clean_athlete_url(fighter_link.get("href")) if fighter_link else None,
                }
            )

    return records


def _name_key(name: str) -> str:
    folded = unicodedata.normalize("NFKD", "".join(NON_DECOMPOSING.get(char, char) for char in str(name)))
    return " ".join("".join(c for c in folded if c.isalnum() or c.isspace()).lower().split())


def departed_fighters(path: Path = STATUS_OVERRIDES_PATH) -> dict[str, str]:
    """Fighters status_overrides.csv marks as former (retired or released): name key -> name as written there."""
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8") as handle:
        return {_name_key(row["name"]): row["name"] for row in csv.DictReader(handle) if row.get("status", "").strip().lower() == "former"}


def drop_departed(records: list[dict], departed: dict[str, str]) -> tuple[list[dict], list[str]]:
    """Removes fighters who retired or were released before ufc.com updated its rankings, and moves up those below them.

    ufc.com takes days or weeks to drop them; the site should not list a retired fighter in the meantime. The rows
    reappear by themselves only if the override is deleted while ufc.com still ranks the fighter."""
    kept: list[dict] = []
    removed: list[str] = []
    gaps: dict[str, list[int]] = {}
    for record in records:
        if _name_key(record["fighter"]) in departed:
            removed.append(f"{record['category']}: {record['fighter']} (#{record['rank']})")
            gaps.setdefault(record["category"], []).append(record["rank"])
            continue
        kept.append(record)
    for record in kept:
        below = sum(1 for rank in gaps.get(record["category"], []) if 0 < rank < record["rank"])
        if below:
            record["rank"] -= below
    return kept, removed


def rankings_problem(records: list[dict], previous_rows: int | None = None) -> str | None:
    """A partial page must not replace the stored rankings."""
    if not records:
        return "parsed zero ranking rows"
    categories = {record["category"] for record in records}
    if len(categories) < GROUPS_EXPECTED:
        return f"only {len(categories)} categories (expected {GROUPS_EXPECTED})"
    if any(not str(record.get("fighter") or "").strip() for record in records):
        return "a ranking row has no fighter name"
    if previous_rows and len(records) < previous_rows * 0.8:
        return f"rows dropped from {previous_rows} to {len(records)}"
    return None


def previous_ranking_rows() -> int | None:
    if not OUTPUT_PATH.exists():
        return None
    with OUTPUT_PATH.open(encoding="utf-8", newline="") as handle:
        return max(sum(1 for _ in handle) - 1, 0)


def load_previous_rankings() -> list[dict]:
    if not OUTPUT_PATH.exists():
        return []
    with OUTPUT_PATH.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def ranking_changes(old: list[dict], new: list[dict]) -> list[str]:
    """One line per fighter who moved, entered or left a ranking since the last run (rank 0 is the champion)."""
    def places(rows: list[dict]) -> dict[tuple[str, str], int]:
        return {(str(row["category"]), str(row["fighter"]).strip()): int(row["rank"]) for row in rows}

    before, after = places(old), places(new)
    lines = []
    for (category, fighter), rank in sorted(after.items(), key=lambda item: (item[0][0], item[1])):
        was = before.get((category, fighter))
        if was == rank:
            continue
        if rank == 0:
            lines.append(f"{category}: {fighter} is now champion")
        elif was is None:
            lines.append(f"{category}: {fighter} enters at #{rank}")
        else:
            lines.append(f"{category}: {fighter} #{'C' if was == 0 else was} -> #{rank}")
    for category, fighter in sorted(set(before) - set(after)):
        lines.append(f"{category}: {fighter} left the rankings")
    return lines


def save_rankings(records: list[dict]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(records)


def main() -> None:
    print("[info] Fetching https://www.ufc.com/rankings ...")
    html = fetch_rankings_html()
    records = parse_rankings(html)
    problem = rankings_problem(records, previous_ranking_rows())
    if problem:
        raise RuntimeError(f"Rankings left unchanged: {problem}.")
    records, removed = drop_departed(records, departed_fighters())
    for line in removed:
        print(f"[info] left out, marked former in status_overrides.csv: {line}")

    changes = ranking_changes(load_previous_rankings(), records) if previous_ranking_rows() else []
    save_rankings(records)
    categories = sorted({record["category"] for record in records})
    print(f"[info] Saved {len(records)} ranking rows across {len(categories)} categories.")
    for category in categories:
        print(f"  - {category}")
    print(f"[info] {len(changes)} ranking changes since the last run" if changes else "[info] No ranking changes since the last run.")
    for line in changes:
        print(f"  ~ {line}")


if __name__ == "__main__":
    main()
