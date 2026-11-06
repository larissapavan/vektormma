"""Fights that were booked, called off and never took place (data/raw/cancelled_fights.csv).

The file is written by hand: each row is a bout the UFC announced for a card and that fell through (injury, missed weight, a
cancelled event) and that the two fighters have not fought since. Nothing else in the data records a fight that did not
happen, so it cannot be scraped. Two checks keep the list honest as the data moves on: a pair that appears in the fight
history on or after the booked date, or on an announced card, has taken place after all and drops out of the list.
"""

from __future__ import annotations

import logging

import pandas as pd

from src.ufc_predictor.config import RAW_DATA_DIR

from .catalog_service import _normalize_name, get_fighter_profile
from .events_service import UPCOMING_EVENTS_SOURCE_PATH, get_upcoming_events
from .fight_history_service import EVENT_CARDS_SOURCE_PATH, get_fights_for_fighter

logger = logging.getLogger(__name__)

CANCELLED_FIGHTS_SOURCE_PATH = RAW_DATA_DIR / "cancelled_fights.csv"
REASONS = frozenset({"injury", "missed_weight", "travel_restrictions", "event_cancelled", "other"})

_cache: dict = {"signature": None, "service": None, "data": None}


def _signature() -> tuple | None:
    if not CANCELLED_FIGHTS_SOURCE_PATH.exists():
        return None
    return tuple(
        path.stat().st_mtime_ns if path.exists() else None
        for path in (CANCELLED_FIGHTS_SOURCE_PATH, EVENT_CARDS_SOURCE_PATH, UPCOMING_EVENTS_SOURCE_PATH)
    )


def load_cancelled_rows() -> list[dict]:
    """The rows of the file as written (no filtering), for the validation and the tests."""
    if not CANCELLED_FIGHTS_SOURCE_PATH.exists():
        return []
    frame = pd.read_csv(CANCELLED_FIGHTS_SOURCE_PATH, dtype=str, keep_default_na=False)
    return frame.to_dict(orient="records")


def get_cancelled_fights(prediction_service=None) -> list[dict]:
    """The cancelled fights that still have not happened, most recent booking first."""
    signature = _signature()
    if _cache["signature"] != signature or _cache["service"] is not prediction_service or _cache["data"] is None:
        _cache.update(signature=signature, service=prediction_service, data=_build(prediction_service))
    return _cache["data"]


def has_taken_place(fighter_1: str, fighter_2: str, booked: str) -> bool:
    """True when the two fought each other on or after the booked date, or are announced to fight on a card."""
    key = _normalize_name(fighter_2)
    for fight in get_fights_for_fighter(fighter_1):
        if _normalize_name(fight["opponent"]) == key and (fight["date"] or "") >= booked:
            return True
    keys = {_normalize_name(fighter_1), _normalize_name(fighter_2)}
    for event in get_upcoming_events():
        for fight in event.get("fights", []):
            if {_normalize_name(str(fight.get("fighter_1"))), _normalize_name(str(fight.get("fighter_2")))} == keys:
                return True
    return False


def _fighter(name: str) -> tuple[dict, dict | None]:
    try:
        profile = get_fighter_profile(name)
    except KeyError:
        return {"name": name}, None
    wins, losses, draws = profile.get("wins"), profile.get("losses"), profile.get("draws")
    record = f"{int(wins)}-{int(losses)}-{int(draws or 0)}" if wins is not None and losses is not None else None
    return (
        {
            "name": profile["name"],
            "profile_name": profile["name"],
            "image_url": profile.get("image_url"),
            "country_code": profile.get("country_code"),
            "record": record,
            "ufc_status": profile.get("ufc_status"),
        },
        profile,
    )


def _model_pick(prediction_service, row: dict, profiles: tuple[dict | None, dict | None]) -> dict | None:
    """The model's pick, only when it can be trusted: it reads each fighter's numbers as they are today, so a fighter who
    stopped competing (or one the catalog does not know) is left out and the page says why."""
    first, second = profiles
    if prediction_service is None or first is None or second is None or any(profile.get("ufc_status") != "active" for profile in (first, second)):
        return None
    try:
        result = prediction_service.predict_pick(
            first["name"],
            second["name"],
            {
                "weight_class": row["weight_class"],
                "title_fight": row["title_fight"] == "true",
                "num_rounds": int(row["rounds"] or 0) or None,
            },
        )
    except Exception:
        logger.exception("Could not score the cancelled fight %s.", row["fight_id"])
        return None
    return {
        "predicted_winner": result["predicted_winner"],
        "probability": result["probability"],
        "fighter_1_probability": result["fighter_a_probability"],
    }


def _build(prediction_service) -> list[dict]:
    fights: list[dict] = []
    for row in load_cancelled_rows():
        if has_taken_place(row["fighter_1"], row["fighter_2"], row["event_date"]):
            continue
        first, first_profile = _fighter(row["fighter_1"])
        second, second_profile = _fighter(row["fighter_2"])
        model = _model_pick(prediction_service, row, (first_profile, second_profile))
        if model is not None:
            # The pick comes back in the order of the file; fighter_1_probability is the chance of the first name in it.
            if model["predicted_winner"] not in (first["name"], second["name"]):
                model = None
        fights.append(
            {
                "id": row["fight_id"],
                "fighter_1": first,
                "fighter_2": second,
                "weight_class": row["weight_class"],
                "title_fight": row["title_fight"] == "true",
                "rounds": int(row["rounds"]) if row["rounds"] else None,
                "event_name": row["event_name"],
                "event_date": row["event_date"],
                "reason": row["reason"] if row["reason"] in REASONS else "other",
                "withdrew": row["withdrew"] or None,
                "attempts": int(row["attempts"] or 1),
                "source_url": row["source_url"] or None,
                "model": model,
            }
        )
    fights.sort(key=lambda fight: fight["event_date"], reverse=True)
    return fights
