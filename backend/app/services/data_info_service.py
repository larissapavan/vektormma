from __future__ import annotations

import json
import logging

from backend.app.services.catalog_service import (
    get_fighter_catalog,
    get_latest_fight_date,
    get_total_fights_tracked,
)
from backend.app.services.events_service import get_event_count
from backend.app.services.org_service import ORGS, get_org_counts
from src.ufc_predictor.config import RAW_DATA_DIR

logger = logging.getLogger(__name__)

DATA_SOURCES = [
    "ufcstats.com",
    "ufc.com",
    "espn.com",
    "pflmma.com",
    "onefc.com",
    "oktagonmma.com",
    "sherdog.com",
    "wikipedia.org",
    "tapology.com",
    "fighthub.net",
]

# Written by the daily refresh (scripts/refresh_status.py). The date of a file cannot say how fresh the data is: in the
# deployed image every file carries the date of the build.
REFRESH_STATUS_PATH = RAW_DATA_DIR / "refresh_status.json"
MAIN_SOURCE = "espn"  # events, results and cards: what "the data goes up to" means


def get_refresh_status() -> list[dict]:
    """When each source was last refreshed, the one the site rests on first. Empty until a refresh has written the file."""
    try:
        status = json.loads(REFRESH_STATUS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []

    def day(value: str | None) -> str | None:
        return value[:10] if value else None

    return [
        {"source": source, "last_success": day(entry.get("last_success")), "failing_since": day(entry.get("failing_since"))}
        for source, entry in sorted(status.items(), key=lambda item: (item[0] != MAIN_SOURCE, item[0]))
    ]


def get_data_info() -> dict:
    catalog = get_fighter_catalog()

    refresh = get_refresh_status()
    latest_fight_date = get_latest_fight_date()
    main = next((entry["last_success"] for entry in refresh if entry["source"] == MAIN_SOURCE), None)

    total_fights = get_total_fights_tracked()
    total_fighters = len(catalog)
    total_events = get_event_count()

    for org_id in ORGS:
        try:
            counts = get_org_counts(org_id)
        except Exception:
            logger.exception("Could not count what the site has of %s.", org_id)
            continue
        total_fighters += counts["fighters"]
        total_events += counts["events"]
        total_fights += counts["fights"]

    return {
        # Without a recorded refresh the newest fight is all that can be said for sure.
        "last_updated": main or latest_fight_date,
        "latest_fight_date": latest_fight_date,
        "refresh": refresh,
        "fighters_count": total_fighters,
        "events_count": total_events,
        "fights_count": total_fights,
        "sources": DATA_SOURCES,
    }
