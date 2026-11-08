"""The results of the last few days, across the UFC and every other organisation, next to what the model had picked.

Nothing is stored here: the events come from the same services the event pages use, and the picks from the prediction log.
A pick is only attached to a fight the log has (the model predicts the UFC), and it is matched by day and pair of names, so
the order the corners are listed in does not matter.
"""

from __future__ import annotations

from datetime import date, timedelta

from .events_service import get_events
from .org_service import _name_key, get_org_events, get_org_upcoming_events, list_orgs
from .track_record_service import load_log

UFC_ID = "ufc"
UFC_NAME = "UFC"


def _pair(fighter_1: str | None, fighter_2: str | None) -> tuple[str, str]:
    return tuple(sorted((_name_key(fighter_1), _name_key(fighter_2))))  # type: ignore[return-value]


def _outcome(fight: dict) -> str:
    if fight.get("winner"):
        return "win"
    method = (fight.get("method") or "").strip().upper()
    result = (fight.get("result") or "").strip().upper()
    if "NO CONTEST" in method or method == "NC" or "NO CONTEST" in result:
        return "no_contest"
    if method == "DRAW" or "DRAW" in result:
        return "draw"
    return "pending"


def _picks_by_fight(log) -> dict[tuple[str, tuple[str, str]], dict]:
    picks = {}
    for row in log.to_dict("records"):
        picks[(str(row["event_date"]), _pair(row["fighter_1"], row["fighter_2"]))] = row
    return picks


def _fight(fight: dict, day: str, picks: dict) -> dict:
    outcome = _outcome(fight)
    entry = {
        "fighter_1": fight["fighter_1"],
        "fighter_2": fight["fighter_2"],
        "winner": fight.get("winner"),
        "outcome": outcome,
        "weight_class": fight.get("weight_class"),
        "stage": fight.get("stage"),
        "method": fight.get("method"),
        "method_detail": fight.get("method_detail"),
        "round": fight.get("round"),
        "time": fight.get("time"),
        "title_fight": fight.get("title_fight"),
        "discipline": fight.get("discipline"),
        "pick": None,
    }
    row = picks.get((day, _pair(fight["fighter_1"], fight["fighter_2"])))
    if row is not None and row.get("predicted_winner"):
        pick = {"predicted_winner": row["predicted_winner"], "confidence": float(row["confidence"] or 0), "correct": None}
        if outcome == "win":
            pick["correct"] = _name_key(row["predicted_winner"]) == _name_key(fight["winner"])
        entry["pick"] = pick
    return entry


def _event(org_id: str, org_name: str, event: dict, picks: dict) -> dict | None:
    fights = [_fight(fight, event["date"], picks) for fight in event["fights"]]
    decided = sum(1 for fight in fights if fight["outcome"] != "pending")
    if decided == 0:
        return None  # a card whose results are not in yet is not "a result"
    return {
        "org_id": org_id,
        "org_name": org_name,
        "name": event["name"],
        "date": event["date"],
        "location": event.get("location"),
        "fights": fights,
        "decided": decided,
        "total": len(fights),
    }


def get_recent_results(days: int = 7, today: date | None = None) -> dict:
    until = today or date.today()
    since = until - timedelta(days=days - 1)
    first, last = since.isoformat(), until.isoformat()
    picks = _picks_by_fight(load_log())

    sources = [(UFC_ID, UFC_NAME, get_events())]
    # An organisation's own "upcoming" list still holds today's card, which may already have results.
    sources += [(org.id, org.short_name, get_org_events(org.id) + get_org_upcoming_events(org.id)) for org in list_orgs()]

    events = []
    for org_id, org_name, listed in sources:
        for event in listed:
            day = event.get("date")
            if day and first <= day <= last:
                shaped = _event(org_id, org_name, event, picks)
                if shaped:
                    events.append(shaped)
    # Newest day first; within a day the UFC leads, then the larger cards.
    events.sort(key=lambda event: (event["date"], event["org_id"] == UFC_ID, event["decided"]), reverse=True)

    scored = [fight["pick"] for event in events for fight in event["fights"] if fight["pick"] and fight["pick"]["correct"] is not None]
    return {
        "since": first,
        "until": last,
        "events": events,
        "picks_resolved": len(scored),
        "picks_correct": sum(1 for pick in scored if pick["correct"]),
    }
