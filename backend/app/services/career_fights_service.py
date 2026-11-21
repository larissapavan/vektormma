"""A fighter's whole professional career (UFC and every other organization), for the profile's complete record and timeline.

Two files hold it:
    - data/raw/career_history_cache.json: kept by hand for a few dozen stars; it wins for the fighters it has;
    - data/raw/sherdog_careers.json: every active fighter scripts/scrape_sherdog_careers.py could link to Sherdog.
A fighter in neither file shows the UFC record as the whole career (fight_history_service).
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from src.ufc_predictor.config import RAW_DATA_DIR

logger = logging.getLogger(__name__)

CACHE_FILE = RAW_DATA_DIR / "career_history_cache.json"
SHERDOG_FILE = RAW_DATA_DIR / "sherdog_careers.json"

_caches: dict[Path, tuple[float, dict[str, dict]]] = {}


def _load(path: Path) -> dict[str, dict]:
    """The file's fighters, read again only when it changes."""
    if not path.exists():
        return {}
    try:
        mtime = path.stat().st_mtime
        cached = _caches.get(path)
        if cached is None or cached[0] != mtime:
            with open(path, "r", encoding="utf-8") as handle:
                _caches[path] = (mtime, json.load(handle))
        return _caches[path][1]
    except Exception as error:  # noqa: BLE001 - a broken file must not take the profile down
        logger.warning("Could not read %s: %s", path.name, error)
        return _caches.get(path, (0.0, {}))[1]


def _find(cache: dict[str, dict], fighter_name: str) -> dict | None:
    if fighter_name in cache:
        return cache[fighter_name]
    norm = fighter_name.strip().lower()
    for name, data in cache.items():
        if name.strip().lower() == norm:
            return data
    return None


def get_career_history(fighter_name: str) -> dict | None:
    """Return the complete MMA career history (UFC + all other organizations) for a fighter.

    Returns:
        dict with:
            - ufc_record: {total, wins, losses, draws, nc, win_rate}
            - complete_record: {total, wins, losses, draws, nc, win_rate}
            - organizations: list[str]
            - fights: list[dict], oldest first
    """
    return _find(_load(CACHE_FILE), fighter_name) or _find(_load(SHERDOG_FILE), fighter_name)
