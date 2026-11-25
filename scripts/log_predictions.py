"""Keep the model's track record: log a prediction for every announced fight, then settle it once the result is in.

Two steps, run around the ESPN refresh in scripts.update_all:
    log_upcoming()  before it, while the cards are still "upcoming": the pick and confidence are stored with the stats
                    as they are that day. Only for cards on a later day than today (UTC): on the day itself a fight may
                    already be over. A fight already in the log is never re-predicted, unless the model itself changed
                    and refresh_unresolved() is run by hand.
    resolve()       after it, when finished fights have a winner: marks each logged pick right or wrong, and closes the
                    picks of fights that never took place (see void_reason).

Nothing is back-filled. Predicting an old fight with today's career numbers would not be a prediction.

Usage (from the repo root):
    python -m scripts.log_predictions            # log, then resolve
    python -m scripts.log_predictions --resolve-only
    python -m scripts.log_predictions --refresh-unresolved   # after a model change: re-pick fights still to come
"""

from __future__ import annotations

import argparse
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.services.catalog_service import _normalize_name, canonical_name
from backend.app.services.events_service import get_upcoming_events
from backend.app.services.fight_history_service import _load_fight_history
from backend.app.services.track_record_service import (
    DID_NOT_HAPPEN,
    DUPLICATE_PICK,
    LOG_COLUMNS,
    RESCHEDULED,
    VOID_REASONS,
    load_log,
    save_log,
)

# How far the day a result was filed under may be from the announced one and still be the same fight.
RESULT_DAY_TOLERANCE = 2
# How long after its day a fight without a result is left open before it counts as one that never took place.
VOID_AFTER_DAYS = 3


def utc_today() -> str:
    """Today in UTC. A card in the Americas is never over before its own date begins in UTC; a local day can be one behind."""
    return datetime.now(timezone.utc).date().isoformat()


def fight_key(event_date: str, fighter_1: str, fighter_2: str) -> str:
    """The same fight whichever corner is listed first."""
    first, second = sorted([_normalize_name(canonical_name(fighter_1)), _normalize_name(canonical_name(fighter_2))])
    return f"{event_date}|{first}|{second}"


def _pair(fighter_1: str, fighter_2: str) -> str:
    return fight_key("", fighter_1, fighter_2)


def _context(fight: dict) -> dict:
    """What the site also gives the model for an announced fight, so that the saved pick is the one it shows."""
    return {name: fight.get(name) for name in ("weight_class", "title_fight", "num_rounds")}


def log_upcoming(service=None, today: str | None = None) -> int:
    """Add a prediction for every announced fight that is not in the log yet. Returns how many were added."""
    if service is None:
        from backend.app.services.prefight_service import build_prediction_service

        service = build_prediction_service()  # the model the site is serving (PREDICTION_MODEL)
    today = today or utc_today()
    log = load_log()
    known = set(log["fight_key"])

    added = []
    for event in get_upcoming_events():
        if not event["date"] or event["date"] <= today:
            continue  # over, or about to be: a pick saved now could be made after the fight
        for fight in event["fights"]:
            fighter_1, fighter_2 = fight["fighter_1"], fight["fighter_2"]
            if not fighter_1 or not fighter_2:
                continue
            key = fight_key(event["date"], fighter_1, fighter_2)
            if key in known:
                continue
            try:
                result = service.predict_pick(fighter_1, fighter_2, _context(fight))
            except KeyError:
                continue  # a debutant we have no profile for yet: nothing to predict from
            known.add(key)
            added.append(
                {
                    "fight_key": key,
                    "event_name": event["name"],
                    "event_date": event["date"],
                    "fighter_1": fighter_1,
                    "fighter_2": fighter_2,
                    "prob_fighter_1": f"{result['fighter_a_probability']:.4f}",
                    "predicted_winner": result["predicted_winner"],
                    "confidence": f"{result['probability']:.4f}",
                    "logged_at": today,
                    "winner": "",
                    "correct": "",
                    "resolved_at": "",
                    "model": getattr(service, "model_key", "current"),
                }
            )
    if added:
        save_log(pd.concat([log, pd.DataFrame(added, columns=LOG_COLUMNS)], ignore_index=True))
    return len(added)


def refresh_unresolved(service=None, today: str | None = None) -> int:
    """Re-predict the saved picks of fights that have not happened yet, after the model changed. Returns how many.

    Only fights on a later date than today and without a result are touched. A pick for an event that already took
    place stays exactly as it was shown, and so does every settled one: the log records what the site said at the time,
    not what a newer model would have said. A re-made pick is still made before its fight, so it stays a real prediction."""
    if service is None:
        from backend.app.services.prefight_service import build_prediction_service

        service = build_prediction_service()
    today = today or utc_today()
    log = load_log()

    contexts = {
        fight_key(event["date"], fight["fighter_1"], fight["fighter_2"]): _context(fight)
        for event in get_upcoming_events()
        for fight in event["fights"]
        if event["date"] and fight["fighter_1"] and fight["fighter_2"]
    }
    refreshed = 0
    for index in log.index[(log["correct"] == "") & (log["event_date"] > today)]:
        try:
            result = service.predict_pick(log.at[index, "fighter_1"], log.at[index, "fighter_2"], contexts.get(log.at[index, "fight_key"]))
        except KeyError:
            continue  # no longer in the catalog: leave the saved pick as it is
        log.loc[index, ["prob_fighter_1", "predicted_winner", "confidence", "logged_at", "model"]] = [
            f"{result['fighter_a_probability']:.4f}",
            result["predicted_winner"],
            f"{result['probability']:.4f}",
            today,
            getattr(service, "model_key", "current"),
        ]
        refreshed += 1
    if refreshed:
        save_log(log)
    return refreshed


def _days_apart(one: str, other: str) -> int:
    return abs((date.fromisoformat(one) - date.fromisoformat(other)).days)


def void_reason(
    row: dict, today: str, results: list[tuple[str, str, str]], announced: dict[str, set[str]], settled: set[tuple[str, str]]
) -> str | None:
    """Why a saved pick without a result will never get one, or None while it still can.

    results are (day, fighter, opponent) of the finished fights, both ways round; announced is the pair -> the days it is
    booked for; settled is the (day, pair) of the picks that were already counted."""
    day, pair = row["event_date"], _pair(row["fighter_1"], row["fighter_2"])
    booked = announced.get(pair, set())
    if booked and day not in booked and max(booked) > day:
        return RESCHEDULED

    limit = (date.fromisoformat(today) - timedelta(days=VOID_AFTER_DAYS)).isoformat()
    newest = max((result_day for result_day, _, _ in results), default="")
    if day > limit or newest < day:
        return None  # too soon, or the results of that day are not in yet

    sides = [_normalize_name(canonical_name(row[side])) for side in ("fighter_1", "fighter_2")]
    for fighter, opponent in (sides, sides[::-1]):
        for result_day, name, other in results:
            if name == fighter and _days_apart(result_day, day) <= RESULT_DAY_TOLERANCE and set(other.split()) & set(opponent.split()):
                # Same day, same fighter, an opponent with a name in common: most likely this very fight under another spelling.
                if (day, _pair(name, other)) in settled:
                    return DUPLICATE_PICK
                print(f"[warn] {row['fighter_1']} vs {row['fighter_2']} ({day}) may be {name} vs {other}: if so, add it to name_aliases.csv")
                return None
    return DID_NOT_HAPPEN


def resolve(today: str | None = None) -> int:
    """Settle logged fights whose result is now in the fight history. Returns how many were closed.

    A pick whose fight never took place is closed too (correct "n/a", the reason in the winner column). It stays in the log,
    counts for neither side, and is settled after all if a result turns up later."""
    today = today or utc_today()
    log = load_log()
    open_rows = log.index[(log["correct"] == "") | log["winner"].isin(VOID_REASONS)]
    if len(open_rows) == 0:
        return 0

    history = _load_fight_history()
    if history.empty:
        return 0
    finished: dict[str, list[tuple[str, str | None]]] = {}
    results: list[tuple[str, str, str]] = []
    for row in history.itertuples():
        if pd.isna(row.event_date_parsed):
            continue
        day = row.event_date_parsed.date().isoformat()
        winner = row.winner if isinstance(row.winner, str) and row.winner.strip() else None
        finished.setdefault(_pair(row.fighter_1, row.fighter_2), []).append((day, winner))
        one, two = (_normalize_name(canonical_name(name)) for name in (row.fighter_1, row.fighter_2))
        results += [(day, one, two), (day, two, one)]

    closed = 0
    for index in open_rows:
        event_date = log.at[index, "event_date"]
        held = [
            (day, winner)
            for day, winner in finished.get(_pair(log.at[index, "fighter_1"], log.at[index, "fighter_2"]), [])
            if _days_apart(day, event_date) <= RESULT_DAY_TOLERANCE
        ]
        if not held:
            continue
        _, winner = min(held, key=lambda fight: _days_apart(fight[0], event_date))
        if winner is None:  # a draw or no contest counts for neither side
            log.loc[index, ["winner", "correct", "resolved_at"]] = ["Draw / no contest", "n/a", today]
        else:
            right = _normalize_name(canonical_name(winner)) == _normalize_name(canonical_name(log.at[index, "predicted_winner"]))
            log.loc[index, ["winner", "correct", "resolved_at"]] = [winner, str(right), today]
        closed += 1

    announced: dict[str, set[str]] = {}
    for event in get_upcoming_events():
        for fight in event["fights"]:
            if event["date"] and fight["fighter_1"] and fight["fighter_2"]:
                announced.setdefault(_pair(fight["fighter_1"], fight["fighter_2"]), set()).add(event["date"])
    settled = {
        (row["event_date"], _pair(row["fighter_1"], row["fighter_2"])) for row in log[log["correct"].isin(["True", "False"])].to_dict("records")
    }
    for index in log.index[log["correct"] == ""]:
        reason = void_reason(log.loc[index].to_dict(), today, results, announced, settled)
        if reason:
            log.loc[index, ["winner", "correct", "resolved_at"]] = [reason, "n/a", today]
            closed += 1
    if closed:
        save_log(log)
    return closed


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--resolve-only", action="store_true")
    parser.add_argument(
        "--refresh-unresolved",
        action="store_true",
        help="re-predict the saved picks of fights still to come (run once after a model change); nothing else is touched",
    )
    args = parser.parse_args(argv)

    if args.refresh_unresolved:
        print(f"[info] predictions refreshed: {refresh_unresolved()}")
        return
    if not args.resolve_only:
        print(f"[info] predictions logged: {log_upcoming()}")
    print(f"[info] predictions settled: {resolve()}")


if __name__ == "__main__":
    main()
