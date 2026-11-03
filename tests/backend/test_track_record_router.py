import pandas as pd
import pytest

from backend.app.services import track_record_service as service


def row(key, confidence, correct, event_date="2026-11-07", predicted="A", winner=""):
    return {
        "fight_key": key,
        "event_name": "UFC 999",
        "event_date": event_date,
        "fighter_1": "A",
        "fighter_2": "B",
        "prob_fighter_1": "0.5",
        "predicted_winner": predicted,
        "confidence": str(confidence),
        "logged_at": "2026-11-01",
        "winner": winner,
        "correct": correct,
        "resolved_at": "2026-11-08" if correct else "",
    }


@pytest.fixture
def fake_log(tmp_path, monkeypatch):
    monkeypatch.setattr(service, "PREDICTION_LOG_PATH", tmp_path / "prediction_log.csv")
    service._cache.update({"signature": None, "data": None})
    yield tmp_path / "prediction_log.csv"
    service._cache.update({"signature": None, "data": None})


def test_without_a_log_the_page_says_tracking_has_not_started(client, fake_log):
    body = client.get("/track-record").json()
    assert body["logged"] == 0 and body["resolved"] == 0 and body["accuracy"] is None
    assert body["bands"] == [] and body["recent"] == []


def test_accuracy_bands_and_misses_come_from_the_settled_fights(client, fake_log):
    service.save_log(
        pd.DataFrame(
            [
                row("1", 0.55, "True", winner="A"),
                row("2", 0.65, "False", winner="B"),
                row("3", 0.92, "False", winner="B"),
                row("4", 0.85, "True", winner="A"),
                row("5", 0.7, "n/a", winner="Draw / no contest"),
                row("6", 0.75, "", event_date="2026-11-14"),
            ],
            columns=service.LOG_COLUMNS,
        )
    )
    body = client.get("/track-record").json()

    assert (body["logged"], body["resolved"], body["correct"], body["pending"]) == (6, 4, 2, 1)
    assert body["accuracy"] == 0.5
    assert body["next_event"] == {"name": "UFC 999", "date": "2026-11-14"}
    assert [band["label"] for band in body["bands"]] == ["50-60%", "60-70%", "80%+"]
    assert body["biggest_misses"][0]["confidence"] == 0.92  # the most confident wrong pick comes first
    assert all(fight["winner"] for fight in body["recent"])


def test_track_record_is_cacheable(client):
    assert "max-age" in client.get("/track-record").headers.get("cache-control", "")


def test_picks_saved_before_the_corrected_model_are_flagged(client, fake_log):
    old = row("old", 0.9, "")
    old["logged_at"] = "2026-10-15"
    new = row("new", 0.6, "")
    new["logged_at"] = service.SYMMETRIC_MODEL_SINCE
    service.save_log(pd.DataFrame([old, new], columns=service.LOG_COLUMNS))

    body = client.get("/track-record").json()
    assert body["earlier_model_picks"] == 1
    assert "1 of these picks were saved before 2026-10-20" in body["earlier_model_note"]
    assert "different answer depending on which fighter was listed first" in body["earlier_model_note"]


def test_no_note_when_every_pick_comes_from_the_current_model(client, fake_log):
    service.save_log(pd.DataFrame([row("new", 0.6, "")], columns=service.LOG_COLUMNS))  # logged 2026-11-01
    body = client.get("/track-record").json()
    assert body["earlier_model_picks"] == 0 and body["earlier_model_note"] is None


def test_one_model_alone_has_no_per_model_table_and_no_change_note(client, fake_log):
    service.save_log(pd.DataFrame([row("a", 0.6, "True", winner="A"), row("b", 0.7, "")], columns=service.LOG_COLUMNS))
    body = client.get("/track-record").json()
    assert body["models"] == [] and body["model_change_note"] is None


def test_picks_of_the_prefight_model_are_counted_apart_from_the_earlier_ones(client, fake_log):
    old_right = {**row("o1", 0.9, "True", winner="A"), "logged_at": "2026-10-25"}  # no "model": saved before the column existed
    old_wrong = {**row("o2", 0.8, "False", winner="B"), "logged_at": "2026-10-26"}
    new_right = {**row("n1", 0.6, "True", winner="A"), "logged_at": "2026-11-10", "model": "prefight"}
    new_pending = {**row("n2", 0.65, ""), "logged_at": "2026-11-10", "model": "prefight"}
    service.save_log(pd.DataFrame([old_right, old_wrong, new_right, new_pending], columns=service.LOG_COLUMNS))

    body = client.get("/track-record").json()
    current, prefight = body["models"]
    assert (current["model"], current["label"], current["since"]) == ("current", "Current model", "2026-10-25")
    assert (current["logged"], current["resolved"], current["correct"], current["accuracy"]) == (2, 2, 1, 0.5)
    assert (prefight["model"], prefight["label"], prefight["since"]) == ("prefight", "Pre-fight model", "2026-11-10")
    assert (prefight["logged"], prefight["resolved"], prefight["correct"], prefight["accuracy"]) == (2, 1, 1, 1.0)
    assert body["model_change_note"] == (
        "2 of these picks were saved by the pre-fight model, in use since 2026-11-10. "
        "Earlier picks came from the model it replaced and are kept exactly as they were shown. "
        "The record of each model is counted separately below."
    )
    assert body["logged"] == 4  # the overall numbers still count every pick


def test_a_log_file_from_before_the_model_column_still_loads(client, fake_log):
    old = pd.DataFrame([row("a", 0.6, "True", winner="A")], columns=service.LOG_COLUMNS).drop(columns=["model"])
    old.to_csv(fake_log, index=False)
    assert service.load_log()["model"].tolist() == [""]
    assert client.get("/track-record").json()["logged"] == 1
