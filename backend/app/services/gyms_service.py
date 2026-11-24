"""Gyms and the fighters who train in them (data/raw/gyms.csv and gym_fighters.csv, from scripts/scrape_gyms.py).

The gym data does not say which organization a fighter belongs to, so each fighter is matched by name with the UFC
catalog and with every other organization's fighters: that is what gives a gym "12 UFC fighters, 3 PFL fighters" and lets a
gym page show our photo, title and profile for the fighters we know.
"""

from __future__ import annotations

import csv
from pathlib import Path

from src.ufc_predictor.config import RAW_DATA_DIR

from .catalog_service import list_fighters
from .crossorg_service import MAX_DIVISION_GAP, _division_rank, _womens
from .org_service import ORGS, _name_key, get_org_fighters

GYMS_PATH = RAW_DATA_DIR / "gyms.csv"
GYM_FIGHTERS_PATH = RAW_DATA_DIR / "gym_fighters.csv"

_cache: dict = {"signature": None, "data": None}


def _read(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def _signature() -> tuple:
    paths = [GYMS_PATH, GYM_FIGHTERS_PATH, RAW_DATA_DIR / "fighters.csv", *(org.data_dir / "fighters.csv" for org in ORGS.values())]
    return tuple(path.stat().st_mtime_ns if path.exists() else None for path in paths)


def _known_fighters() -> dict[str, dict[str, dict]]:
    """name key -> {organization: that organization's profile of the fighter}."""
    known: dict[str, dict[str, dict]] = {}
    for fighter in list_fighters(ufc_only=True):
        known.setdefault(_name_key(fighter["name"]), {})["ufc"] = fighter
    for org_id in ORGS:
        for fighter in get_org_fighters(org_id):
            known.setdefault(_name_key(fighter["name"]), {})[org_id] = fighter
    return known


def _same_division_range(gym_division: str | None, profile_division: str | None) -> bool:
    """A name is not enough when two fighters share it: the gym's flyweight "Bruno Silva" (Bruno Gustavo da Silva in the
    catalog) is not the catalog's middleweight Bruno Silva. Same guard as crossorg_service: same gender, close divisions."""
    if _womens(gym_division) is not None and _womens(profile_division) is not None and _womens(gym_division) != _womens(profile_division):
        return False
    gym_rank, profile_rank = _division_rank(gym_division), _division_rank(profile_division)
    return gym_rank is None or profile_rank is None or abs(gym_rank - profile_rank) <= MAX_DIVISION_GAP


def _build() -> dict:
    known = _known_fighters()
    fighters_by_gym: dict[str, list[dict]] = {}
    for row in _read(GYM_FIGHTERS_PATH):
        profiles = {org: profile for org, profile in known.get(_name_key(row["fighter"]), {}).items() if _same_division_range(row["division"], profile.get("division"))}
        # The organization the fighter is active in first, then the UFC, then the rest.
        orgs = sorted(profiles, key=lambda org: (not profiles[org].get("is_active"), org != "ufc", org))
        first = profiles[orgs[0]] if orgs else {}
        fighters_by_gym.setdefault(row["gym_slug"], []).append(
            {
                "name": first.get("name") or row["fighter"],
                "nickname": row["nickname"] or None,
                "division": row["division"] or None,
                "country_code": row["country_code"] or None,
                "record": row["record"] or None,
                "orgs": orgs,
                "image_url": next((profiles[org].get("image_url") for org in orgs if profiles[org].get("image_url")), None),
                "belt": any(profile.get("belt") for profile in profiles.values()),
                "is_active": any(profile.get("is_active") for profile in profiles.values()),
            }
        )

    gyms = []
    for row in _read(GYMS_PATH):
        fighters = fighters_by_gym.get(row["slug"], [])
        fighters.sort(key=lambda fighter: (not fighter["belt"], not fighter["orgs"], not fighter["is_active"], fighter["name"].lower()))
        counts: dict[str, int] = {}
        for fighter in fighters:
            for org in fighter["orgs"]:
                counts[org] = counts.get(org, 0) + 1
        gyms.append(
            {
                "slug": row["slug"],
                "name": row["name"],
                "url": row["url"] or None,
                "fighters_count": int(row["fighters_count"] or 0),
                "orgs": counts,
                "champions": sum(fighter["belt"] for fighter in fighters),
                "fighters": fighters,
            }
        )
    return {"gyms": gyms, "by_slug": {gym["slug"]: gym for gym in gyms}}


def _data() -> dict:
    signature = _signature()
    if _cache["signature"] != signature:
        _cache["data"] = _build()
        _cache["signature"] = signature
    return _cache["data"]


def list_gyms() -> list[dict]:
    """Every gym, the biggest first, without the fighter lists."""
    return [{key: value for key, value in gym.items() if key != "fighters"} for gym in _data()["gyms"]]


def get_gym(slug: str) -> dict:
    try:
        return _data()["by_slug"][slug]
    except KeyError as exc:
        raise KeyError(f"Gym not found: {slug}") from exc
