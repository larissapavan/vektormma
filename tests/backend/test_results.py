from datetime import date
from types import SimpleNamespace

import pandas as pd
import pytest

from backend.app.services import results_service

TODAY = date(2026, 11, 8)


def fight(a, b, winner=None, method=None, **extra):
    return {"fighter_1": a, "fighter_2": b, "winner": winner, "method": method, "weight_class": "Lightweight", **extra}


def event(name, day, fights):
    return {"name": name, "date": day, "location": "Somewhere", "fights": fights}


LOG = pd.DataFrame(
    [
        {"event_date": "2026-11-07", "fighter_1": "Ana Silva", "fighter_2": "Bia Costa", "predicted_winner": "Ana Silva", "confidence": "0.71"},
        {"event_date": "2026-11-07", "fighter_1": "Cid Lima", "fighter_2": "Davi Rocha", "predicted_winner": "Cid Lima", "confidence": "0.64"},
        {"event_date": "2026-11-07", "fighter_1": "Eli Souza", "fighter_2": "Fabio Dias", "predicted_winner": "Eli Souza", "confidence": "0.55"},
    ]
)


@pytest.fixture
def sources(monkeypatch):
    ufc = [
        event(
            "UFC Fight Night: Test",
            "2026-11-07",
            [
                fight("Bia Costa", "Ana Silva", winner="Ana Silva", method="KO/TKO", round=1, time="1:00"),  # corners swapped in the log
                fight("Cid Lima", "Davi Rocha", winner="Davi Rocha", method="U-DEC"),
                fight("Eli Souza", "Fabio Dias"),  # not fought yet
                fight("Gil Mota", "Hugo Neves", method="NO CONTEST"),
            ],
        ),
        event("UFC 999: Too old", "2026-10-01", [fight("A", "B", winner="A", method="SUB")]),
        event("UFC 998: No results yet", "2026-11-08", [fight("C", "D")]),
    ]
    orgs = {
        "pfl": [event("PFL Test", "2026-11-06", [fight("Ivo Lara", "Jon Paes", winner="Ivo Lara", method="KO/TKO")])],
        "one": [],
    }
    upcoming = {"pfl": [], "one": [event("ONE Today", "2026-11-08", [fight("Kai Moura", "Leo Pinto", winner="Leo Pinto", method="SUB")])]}
    monkeypatch.setattr(results_service, "get_events", lambda: ufc)
    monkeypatch.setattr(results_service, "list_orgs", lambda: [SimpleNamespace(id="pfl", short_name="PFL"), SimpleNamespace(id="one", short_name="ONE")])
    monkeypatch.setattr(results_service, "get_org_events", lambda org_id: orgs[org_id])
    monkeypatch.setattr(results_service, "get_org_upcoming_events", lambda org_id: upcoming[org_id])
    monkeypatch.setattr(results_service, "load_log", lambda: LOG)


def test_only_events_with_results_inside_the_window_are_listed_newest_first(sources):
    result = results_service.get_recent_results(days=3, today=TODAY)
    assert [(e["date"], e["org_id"]) for e in result["events"]] == [("2026-11-08", "one"), ("2026-11-07", "ufc"), ("2026-11-06", "pfl")]
    assert (result["since"], result["until"]) == ("2026-11-06", "2026-11-08")


def test_each_fight_says_how_it_ended(sources):
    ufc = next(e for e in results_service.get_recent_results(days=3, today=TODAY)["events"] if e["org_id"] == "ufc")
    assert [f["outcome"] for f in ufc["fights"]] == ["win", "win", "pending", "no_contest"]
    assert (ufc["decided"], ufc["total"]) == (3, 4)


def test_a_pick_is_matched_by_pair_whatever_the_corner_order_and_scored(sources):
    result = results_service.get_recent_results(days=3, today=TODAY)
    fights = next(e for e in result["events"] if e["org_id"] == "ufc")["fights"]
    assert fights[0]["pick"] == {"predicted_winner": "Ana Silva", "confidence": 0.71, "correct": True}
    assert fights[1]["pick"]["correct"] is False
    assert fights[2]["pick"]["correct"] is None  # picked, but no winner yet
    assert fights[3]["pick"] is None
    assert (result["picks_resolved"], result["picks_correct"]) == (2, 1)


def test_a_wider_window_reaches_older_events(sources):
    result = results_service.get_recent_results(days=40, today=TODAY)
    assert "UFC 999: Too old" in [e["name"] for e in result["events"]]


def test_the_endpoint_validates_the_window_and_answers(client):
    assert client.get("/results/recent?days=0").status_code == 422
    assert client.get("/results/recent?days=99").status_code == 422
    response = client.get("/results/recent?days=7")
    assert response.status_code == 200
    body = response.json()
    assert {"since", "until", "events", "picks_resolved", "picks_correct"} <= body.keys()
    assert response.headers["cache-control"].startswith("public, max-age=300")
