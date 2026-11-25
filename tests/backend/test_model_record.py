"""How the model has done on one fighter's fights."""

import joblib
import pandas as pd
import pytest

from backend.app.services import model_record_service as service
from backend.app.services import track_record_service
from src.ufc_predictor.config import PREFIGHT_BACKTEST_PATH, PREFIGHT_MODEL_PATH

ROWS = [
    ("2024-01-01", "Ana One", "Bia Two", 0.7, 1),
    ("2024-06-01", "Cleo Three", "Ana One", 0.6, 1),  # she is listed second here and lost, as the model said
    ("2025-01-01", "Ana One", "Dora Four", 0.4, 1),  # an upset
    ("2025-06-01", "Ana One", "Eva Five", 0.5, 0),  # exactly even: the pick is the first one, and it was wrong
]


@pytest.fixture
def fake(tmp_path, monkeypatch):
    path = tmp_path / "backtest.csv"
    pd.DataFrame(ROWS, columns=["date", "fighter_a", "fighter_b", "prob_a", "a_won"]).to_csv(path, index=False)
    monkeypatch.setattr(service, "PREFIGHT_BACKTEST_PATH", path)
    monkeypatch.setattr(track_record_service, "PREDICTION_LOG_PATH", tmp_path / "log.csv")
    service._cache["signature"] = None
    yield path
    service._cache["signature"] = None


def test_the_record_of_a_fighter_counts_each_fight_from_their_side(fake):
    record = service.get_model_record("Ana One")
    backtest = record["backtest"]
    assert (record["start"], record["end"]) == ("2024-01-01", "2025-06-01")
    assert (backtest["fights"], backtest["correct"], backtest["wins"]) == (4, 2, 2)
    assert backtest["expected_wins"] == pytest.approx(0.7 + 0.4 + 0.4 + 0.5)
    assert [(pick["opponent"], pick["won"], pick["correct"]) for pick in backtest["picks"]] == [
        ("Eva Five", False, False), ("Dora Four", True, False), ("Cleo Three", False, True), ("Bia Two", True, True),
    ]
    assert record["live"] is None


def test_both_sides_of_a_fight_agree_on_whether_the_model_was_right(fake):
    for _, one, other, _, _ in ROWS:
        mine = {(p["date"]): p for p in service.get_model_record(one)["backtest"]["picks"]}
        for pick in service.get_model_record(other)["backtest"]["picks"]:
            if pick["opponent"] == one:
                twin = mine[pick["date"]]
                assert twin["correct"] == pick["correct"] and twin["won"] != pick["won"]
                assert twin["chance"] + pick["chance"] == pytest.approx(1)


def log_row(one, other, prob, winner, correct):
    return {
        "fight_key": f"{one}|{other}", "event_name": "UFC", "event_date": "2026-11-07", "fighter_1": one, "fighter_2": other,
        "prob_fighter_1": str(prob), "predicted_winner": one if prob >= 0.5 else other, "confidence": str(max(prob, 1 - prob)),
        "logged_at": "2026-11-01", "winner": winner, "correct": correct, "resolved_at": "2026-11-08" if correct else "", "model": "prefight2",
    }


def test_live_picks_stay_apart_and_only_the_settled_ones_count(fake):
    track_record_service.save_log(
        pd.DataFrame(
            [log_row("Zoe Six", "Ana One", 0.3, "Ana One", "True"), log_row("Ana One", "Iva Seven", 0.8, "", ""), log_row("Ana One", "Ivy Nine", 0.8, "Did not happen", "n/a")],
            columns=track_record_service.LOG_COLUMNS,
        )
    )
    record = service.get_model_record("Ana One")
    assert record["backtest"]["fights"] == 4
    assert (record["live"]["fights"], record["live"]["correct"], record["live"]["wins"]) == (1, 1, 1)
    assert record["live"]["picks"][0]["chance"] == pytest.approx(0.7) and record["live"]["picks"][0]["opponent"] == "Zoe Six"


def test_surprises_list_only_fighters_with_enough_fights(fake, monkeypatch):
    assert service.get_surprises()["fighters"] == 0
    monkeypatch.setattr(service, "SURPRISE_MIN_FIGHTS", 4)
    found = service.get_surprises()
    assert [row["fighter"] for row in found["underrated"]] == ["Ana One"]


def test_without_the_file_there_is_no_record_and_no_error(fake):
    fake.unlink()
    assert service.get_model_record("Ana One")["backtest"] is None
    assert service.get_surprises()["underrated"] == []


def test_the_endpoints_answer_with_the_repository_data(client):
    body = client.get("/fighters/Alex Pereira/model-record").json()
    assert body["backtest"]["fights"] >= 5 and len(body["backtest"]["picks"]) == body["backtest"]["fights"]
    assert client.get("/fighters/Nobody Atall/model-record").status_code == 404
    surprises = client.get("/track-record/surprises").json()
    assert len(surprises["underrated"]) == len(surprises["overrated"]) == 5
    assert all(row["wins"] > row["expected_wins"] for row in surprises["underrated"])


def test_the_file_is_the_test_the_served_model_reports():
    """Both are written by the same training run; a file from another run would contradict the numbers on the site."""
    rows = pd.read_csv(PREFIGHT_BACKTEST_PATH)
    evaluation = joblib.load(PREFIGHT_MODEL_PATH)["evaluation"]
    assert len(rows) == evaluation["fights"]
    assert (rows["date"].min(), rows["date"].max()) == (evaluation["start"], evaluation["end"])
    assert ((rows["prob_a"] >= 0.5) == (rows["a_won"] == 1)).mean() == pytest.approx(evaluation["accuracy"], abs=0.002)
