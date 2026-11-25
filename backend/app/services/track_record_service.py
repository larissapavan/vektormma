"""How the model does on real fights: predictions are logged before a fight and checked once the result is in.

data/raw/prediction_log.csv holds one row per fight. scripts/log_predictions.py adds a row (with the model's pick and
confidence at that moment) for every announced fight and later fills in the winner. Nothing is back-filled: a
prediction made after the fact, with today's stats, would not be a prediction.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

import pandas as pd

from src.ufc_predictor.config import RAW_DATA_DIR

PREDICTION_LOG_PATH = RAW_DATA_DIR / "prediction_log.csv"
LOG_COLUMNS = [
    "fight_key",
    "event_name",
    "event_date",
    "fighter_1",
    "fighter_2",
    "prob_fighter_1",
    "predicted_winner",
    "confidence",
    "logged_at",
    "winner",
    "correct",
    "resolved_at",
    "model",
]
CONFIDENCE_BANDS = [(0.5, 0.6, "50-60%"), (0.6, 0.7, "60-70%"), (0.7, 0.8, "70-80%"), (0.8, 1.01, "80%+")]
# Picks saved before this day came from the first version of the model, which answered differently depending on which
# fighter was listed first. From this day on the pick is the average of both orders.
SYMMETRIC_MODEL_SINCE = "2026-10-20"
# The model that made a pick is stored with it. A row saved before the column existed has none: it came from the only
# model there was.
DEFAULT_MODEL = "current"
MODEL_LABELS = {"current": "First model", "prefight": "Pre-fight model", "prefight2": "Combined pre-fight model"}
# Why a saved pick was closed without a result (the winner column, next to correct "n/a"). It stays in the log and counts
# for neither side. scripts/log_predictions.py decides it.
DID_NOT_HAPPEN = "Did not happen"
RESCHEDULED = "Rescheduled"
DUPLICATE_PICK = "Duplicate pick"
VOID_REASONS = (DID_NOT_HAPPEN, RESCHEDULED, DUPLICATE_PICK)
RECENT_LIMIT = 15
MISS_LIMIT = 5

_cache: dict = {"signature": None, "data": None}


def load_log() -> pd.DataFrame:
    if not PREDICTION_LOG_PATH.exists():
        return pd.DataFrame(columns=LOG_COLUMNS)
    log = pd.read_csv(PREDICTION_LOG_PATH, keep_default_na=False, dtype=str)
    if "model" not in log:
        log["model"] = ""
    return log


def save_log(log: pd.DataFrame) -> None:
    log[LOG_COLUMNS].to_csv(PREDICTION_LOG_PATH, index=False, lineterminator="\r\n")


def get_track_record() -> dict:
    today = datetime.now(timezone.utc).date().isoformat()
    # The day is part of it: a fight stops being "to come" when its day passes, whether or not the file changed.
    signature = (PREDICTION_LOG_PATH.stat().st_mtime_ns if PREDICTION_LOG_PATH.exists() else None, today)
    if _cache["signature"] != signature or _cache["data"] is None:
        _cache["data"] = _build(load_log(), today)
        _cache["signature"] = signature
    return _cache["data"]


def wilson(right: int, total: int, z: float = 1.96) -> tuple[float, float] | None:
    """The range the true hit rate is in, 95 times out of 100, when `right` of `total` picks were right. With few fights it is
    wide, which is the point: 24 of 35 could be a model that is right half the time or one that is right four times in five."""
    if total == 0:
        return None
    p, d = right / total, 1 + z * z / total
    centre = (p + z * z / (2 * total)) / d
    half = z * math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / d
    return max(centre - half, 0.0), min(centre + half, 1.0)


def _scores(settled: pd.DataFrame) -> dict:
    """What the settled picks say: hit rate with its range, and how good the percentages were. The Brier score is the mean
    squared distance between the confidence of a pick and what happened; saying 50% every time scores 0.25, lower is better."""
    total, right = int(len(settled)), int(settled["correct_flag"].sum())
    interval = wilson(right, total)
    if interval is None:
        return {"accuracy": None, "accuracy_low": None, "accuracy_high": None, "average_confidence": None, "brier": None}
    return {
        "accuracy": right / total,
        "accuracy_low": interval[0],
        "accuracy_high": interval[1],
        "average_confidence": float(settled["confidence"].mean()),
        "brier": float(((settled["confidence"] - settled["correct_flag"]) ** 2).mean()),
    }


def _by_event(settled: pd.DataFrame) -> list[dict]:
    """Each card with a result, newest first."""
    rows = []
    for (day, name), card in settled.groupby(["event_date", "event_name"]):
        rows.append({"name": name, "date": day, "fights": int(len(card)), "correct": int(card["correct_flag"].sum())})
    return sorted(rows, key=lambda row: row["date"], reverse=True)


def _build(log: pd.DataFrame, today: str) -> dict:
    if log.empty:
        return {
            "tracking_since": None,
            "logged": 0,
            "resolved": 0,
            "correct": 0,
            "accuracy": None,
            "accuracy_low": None,
            "accuracy_high": None,
            "average_confidence": None,
            "brier": None,
            "events": [],
            "pending": 0,
            "awaiting_result": 0,
            "voided": 0,
            "earlier_model_picks": 0,
            "earlier_model_note": None,
            "model_change_note": None,
            "models": [],
            "next_event": None,
            "bands": [],
            "recent": [],
            "biggest_misses": [],
        }

    log = log.copy()
    log["confidence"] = pd.to_numeric(log["confidence"], errors="coerce")
    resolved = log[log["correct"].isin(["True", "False"])].copy()
    resolved["correct_flag"] = resolved["correct"].eq("True")
    unsettled = log[log["correct"] == ""]  # draws, no contests and voided picks are closed but never counted either way
    pending = unsettled[unsettled["event_date"] >= today]

    next_event = None
    if not pending.empty:
        dates = pd.to_datetime(pending["event_date"], errors="coerce")
        soonest = pending.loc[dates.idxmin()] if dates.notna().any() else pending.iloc[0]
        next_event = {"name": soonest["event_name"], "date": soonest["event_date"]}

    bands = []
    for low, high, label in CONFIDENCE_BANDS:
        in_band = resolved[(resolved["confidence"] >= low) & (resolved["confidence"] < high)]
        if in_band.empty:
            continue
        bands.append(
            {
                "label": label,
                "fights": int(len(in_band)),
                "average_confidence": float(in_band["confidence"].mean()),
                "accuracy": float(in_band["correct_flag"].mean()),
                **{key: value for key, value in _scores(in_band).items() if key in ("accuracy_low", "accuracy_high")},
            }
        )

    ordered = resolved.sort_values(["event_date", "resolved_at"], ascending=False)
    recent = [_row(row) for _, row in ordered.head(RECENT_LIMIT).iterrows()]
    misses = resolved[~resolved["correct_flag"]].sort_values("confidence", ascending=False)

    earlier = int((log["logged_at"] < SYMMETRIC_MODEL_SINCE).sum())
    models = _by_model(log)
    return {
        "tracking_since": log["logged_at"].min() or None,
        "logged": int(len(log)),
        "resolved": int(len(resolved)),
        "correct": int(resolved["correct_flag"].sum()),
        **_scores(resolved),
        "events": _by_event(resolved),
        "pending": int(len(pending)),
        "awaiting_result": int(len(unsettled) - len(pending)),
        "voided": int(log["winner"].isin(VOID_REASONS).sum()),
        "earlier_model_picks": earlier,
        "earlier_model_note": _earlier_model_note(earlier),
        "model_change_note": _model_change_note(log, models),
        "models": models,
        "next_event": next_event,
        "bands": bands,
        "recent": recent,
        "biggest_misses": [_row(row) for _, row in misses.head(MISS_LIMIT).iterrows()],
    }


def _earlier_model_note(count: int) -> str | None:
    if not count:
        return None
    return (
        f"{count} of these picks were saved before {SYMMETRIC_MODEL_SINCE}, by an earlier version of the model that gave "
        "a different answer depending on which fighter was listed first. They are kept exactly as they were shown. "
        "Picks saved from that day on use the corrected version."
    )


def _by_model(log: pd.DataFrame) -> list[dict]:
    """Each model's own record, oldest model first. Empty while only one model has made picks: there is nothing to tell apart."""
    keys = log["model"].where(log["model"] != "", DEFAULT_MODEL)
    if keys.nunique() < 2:
        return []
    settled = log["correct"].isin(["True", "False"])
    rows = []
    for key in sorted(keys.unique(), key=lambda k: log.loc[keys == k, "logged_at"].min()):
        own = keys == key
        resolved = int((own & settled).sum())
        settled_rows = log[own & settled].assign(correct_flag=lambda rows: rows["correct"].eq("True"))
        correct = int(settled_rows["correct_flag"].sum())
        rows.append(
            {
                "model": key,
                "label": MODEL_LABELS.get(key, key),
                "since": log.loc[own, "logged_at"].min(),
                "logged": int(own.sum()),
                "resolved": resolved,
                "correct": correct,
                "pending": int((own & (log["correct"] == "")).sum()),
                **_scores(settled_rows),
            }
        )
    return rows


def _model_change_note(log: pd.DataFrame, models: list[dict]) -> str | None:
    """Said once picks of a newer model sit in the log next to the earlier ones."""
    newer = [m for m in models if m["model"] != DEFAULT_MODEL]
    if not newer:
        return None
    latest = newer[-1]
    return (
        f"{latest['logged']} of these picks were saved by the {latest['label'].lower()}, in use since {latest['since']}. "
        "Earlier picks came from the model it replaced and are kept exactly as they were shown. "
        "The record of each model is counted separately below."
    )


def _row(row: pd.Series) -> dict:
    return {
        "event_name": row["event_name"],
        "event_date": row["event_date"],
        "fighter_1": row["fighter_1"],
        "fighter_2": row["fighter_2"],
        "predicted_winner": row["predicted_winner"],
        "confidence": float(row["confidence"]),
        "winner": row["winner"] or None,
        "correct": row["correct"] == "True",
    }
