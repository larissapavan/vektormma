"""How the model has done on one fighter's fights: in the back-test on past fights, and live.

The two are never added together. The back-test (models/ufc_prefight_backtest.csv, written with the model by
src/ufc_predictor/train_prefight.py) holds what a version of the model that had only seen earlier fights said about each test
fight. The live record is what the site saved before the fight happened (data/raw/prediction_log.csv).

Next to the hits there are the wins the model expected: the sum of the chances it gave the fighter. Five wins against three
expected say more about a fighter the model underrates than five hits of seven.
"""

from __future__ import annotations

import pandas as pd

from backend.app.services.catalog_service import canonical_name
from backend.app.services.track_record_service import load_log, wilson
from src.ufc_predictor.config import PREFIGHT_BACKTEST_PATH
from src.ufc_predictor.prefight import name_key

# A fighter needs this many test fights before the site says the model has been surprised by them.
SURPRISE_MIN_FIGHTS = 5
SURPRISE_LIMIT = 5

_cache: dict = {"signature": None, "by_fighter": {}, "names": {}, "start": None, "end": None}


def _key(name: str) -> str:
    return name_key(canonical_name(name) or name)


def _load() -> dict:
    signature = PREFIGHT_BACKTEST_PATH.stat().st_mtime_ns if PREFIGHT_BACKTEST_PATH.exists() else None
    if _cache["signature"] == signature and signature is not None:
        return _cache
    by_fighter: dict[str, list[dict]] = {}
    names: dict[str, str] = {}
    start = end = None
    if signature is not None:
        rows = pd.read_csv(PREFIGHT_BACKTEST_PATH)
        start, end = (rows["date"].min(), rows["date"].max()) if len(rows) else (None, None)
        for row in rows.itertuples():
            right = (row.prob_a >= 0.5) == bool(row.a_won)  # said once: at exactly 50% both sides would claim the hit, or neither
            for name, opponent, chance, won in (
                (row.fighter_a, row.fighter_b, row.prob_a, bool(row.a_won)),
                (row.fighter_b, row.fighter_a, 1 - row.prob_a, not row.a_won),
            ):
                key = _key(name)
                names[key] = name
                by_fighter.setdefault(key, []).append(
                    {"date": row.date, "opponent": opponent, "chance": float(chance), "won": won, "correct": right}
                )
        for fights in by_fighter.values():
            fights.sort(key=lambda fight: fight["date"], reverse=True)
    _cache.update(signature=signature, by_fighter=by_fighter, names=names, start=start, end=end)
    return _cache


def _summary(fights: list[dict]) -> dict:
    correct = sum(fight["correct"] for fight in fights)
    interval = wilson(correct, len(fights))
    return {
        "fights": len(fights),
        "correct": correct,
        "accuracy_low": interval[0] if interval else None,
        "accuracy_high": interval[1] if interval else None,
        "wins": sum(fight["won"] for fight in fights),
        "expected_wins": sum(fight["chance"] for fight in fights),
    }


def _live(name: str) -> list[dict]:
    """The picks saved before this fighter's fights that were settled, newest first."""
    key = _key(name)
    log = load_log()
    picks = []
    for row in log[log["correct"].isin(["True", "False"])].to_dict("records"):
        sides = (_key(row["fighter_1"]), _key(row["fighter_2"]))
        if key not in sides:
            continue
        chance = float(row["prob_fighter_1"])
        picks.append(
            {
                "date": row["event_date"],
                "opponent": row["fighter_2"] if sides[0] == key else row["fighter_1"],
                "chance": chance if sides[0] == key else 1 - chance,
                "won": _key(row["winner"]) == key,
                "correct": row["correct"] == "True",
            }
        )
    return sorted(picks, key=lambda pick: pick["date"], reverse=True)


def get_model_record(name: str) -> dict:
    data = _load()
    backtest, live = data["by_fighter"].get(_key(name), []), _live(name)
    return {
        "fighter": name,
        "start": data["start"],
        "end": data["end"],
        "backtest": {**_summary(backtest), "picks": backtest} if backtest else None,
        "live": {**_summary(live), "picks": live} if live else None,
    }


def get_surprises() -> dict:
    """Who won most, and least, against what the model expected of them in the back-test."""
    data = _load()
    rows = [{"fighter": data["names"][key], **_summary(fights)} for key, fights in data["by_fighter"].items() if len(fights) >= SURPRISE_MIN_FIGHTS]
    rows.sort(key=lambda row: row["wins"] - row["expected_wins"], reverse=True)
    return {
        "fighters": len(rows),
        "min_fights": SURPRISE_MIN_FIGHTS,
        "start": data["start"],
        "end": data["end"],
        "underrated": rows[:SURPRISE_LIMIT],
        "overrated": rows[::-1][:SURPRISE_LIMIT],
    }
