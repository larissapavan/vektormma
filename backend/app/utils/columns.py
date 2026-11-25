"""Long lists as columns: one array per field instead of one object per row.

The names of the fields are written once instead of once per row, and values of a kind sit together, so the answer is a fraction of
the size before compression and about half after, and the browser has less to parse. The site asks for it with ?columns=true and
rebuilds the rows (frontend/src/shared/services/columns.ts); without it every endpoint answers as it always did.
"""

from __future__ import annotations

import json
from collections.abc import Iterable

from fastapi import Response

DECIMALS = 3  # more than any figure on screen shows ("85.7%" comes from 0.857)
# Field of a fight that the site only used as a list key: half the weight of the events, and the place in the card does as well.
FIGHT_LEAVES_OUT = {"fight_url"}


def _short(value):
    return round(value, DECIMALS) if isinstance(value, float) else value


def to_columns(rows: list[dict], leave_out: Iterable[str] = ()) -> dict:
    skipped = set(leave_out)
    fields = [field for field in (rows[0] if rows else {}) if field not in skipped]
    return {"count": len(rows), "columns": {field: [_short(row[field]) for row in rows] for field in fields}}


def events_to_columns(events: list[dict]) -> dict:
    """The events, and all their fights one after the other: `fight_count` of each event says how many are its own.
    A winner is 1 or 2, the side that won, and stays a name only where it is neither."""
    fights = [fight for event in events for fight in event["fights"]]
    sides = [
        {**fight, "winner": 1 if fight["winner"] == fight["fighter_1"] else 2 if fight["winner"] == fight["fighter_2"] else fight["winner"]}
        if fight["winner"] is not None
        else fight
        for fight in fights
    ]
    heads = [{**event, "listed": len(event["fights"])} for event in events]
    return {"events": to_columns(heads, {"fights"}), "fights": to_columns(sides, FIGHT_LEAVES_OUT)}


def columns_response(content: dict, headers: dict[str, str]) -> Response:
    """Written straight to JSON: the generic encoder would walk every one of the values again."""
    return Response(json.dumps(content, ensure_ascii=False, separators=(",", ":")), media_type="application/json", headers=headers)
