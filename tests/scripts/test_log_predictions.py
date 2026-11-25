import pandas as pd
import pytest

from backend.app.services import track_record_service
from scripts import log_predictions


class FakeService:
    def __init__(self):
        self.calls = []
        self.contexts = []

    def predict_pick(self, a, b, context=None):
        self.calls.append((a, b))
        self.contexts.append(context)
        if "Unknown" in (a, b):
            raise KeyError("not in the catalog")
        return {"fighter_a_probability": 0.7, "predicted_winner": a, "probability": 0.7}


@pytest.fixture
def log_file(tmp_path, monkeypatch):
    monkeypatch.setattr(track_record_service, "PREDICTION_LOG_PATH", tmp_path / "prediction_log.csv")
    return tmp_path / "prediction_log.csv"


@pytest.fixture(autouse=True)
def no_announced_fights(monkeypatch):
    """No test of this file reads the real cards: they change every day."""
    monkeypatch.setattr(log_predictions, "get_upcoming_events", list)


def upcoming(monkeypatch, fights, date="2026-11-07"):
    event = {"name": "UFC 999: Test", "date": date, "fights": [{"fighter_1": a, "fighter_2": b} for a, b in fights]}
    monkeypatch.setattr(log_predictions, "get_upcoming_events", lambda: [event])


def test_every_announced_fight_is_logged_once_with_the_pick_and_confidence(log_file, monkeypatch):
    upcoming(monkeypatch, [("Fighter One", "Fighter Two"), ("Fighter Three", "Unknown")])
    service = FakeService()

    assert log_predictions.log_upcoming(service, today="2026-11-01") == 1  # the debutant we cannot predict is skipped
    row = track_record_service.load_log().iloc[0]
    assert (row["predicted_winner"], row["confidence"], row["logged_at"]) == ("Fighter One", "0.7000", "2026-11-01")

    # A second run never re-predicts a fight that is already in the log, even with the corners swapped.
    upcoming(monkeypatch, [("Fighter Two", "Fighter One")])
    assert log_predictions.log_upcoming(service, today="2026-11-02") == 0
    assert len(track_record_service.load_log()) == 1


def test_fights_that_already_happened_are_not_logged(log_file, monkeypatch):
    upcoming(monkeypatch, [("Fighter One", "Fighter Two")], date="2026-10-01")
    assert log_predictions.log_upcoming(FakeService(), today="2026-10-15") == 0


def test_nothing_is_logged_on_the_day_of_the_card_because_the_fight_may_be_over(log_file, monkeypatch):
    upcoming(monkeypatch, [("Fighter One", "Fighter Two")], date="2026-11-07")
    assert log_predictions.log_upcoming(FakeService(), today="2026-11-07") == 0
    assert log_predictions.log_upcoming(FakeService(), today="2026-11-06") == 1


def test_the_pick_is_made_with_what_the_site_also_tells_the_model(log_file, monkeypatch):
    fight = {"fighter_1": "Fighter One", "fighter_2": "Fighter Two", "weight_class": "Lightweight", "title_fight": True, "num_rounds": 5}
    monkeypatch.setattr(log_predictions, "get_upcoming_events", lambda: [{"name": "UFC 999", "date": "2026-11-07", "fights": [fight]}])
    service = FakeService()
    log_predictions.log_upcoming(service, today="2026-11-01")
    log_predictions.refresh_unresolved(service, today="2026-11-02")
    assert service.contexts == [{"weight_class": "Lightweight", "title_fight": True, "num_rounds": 5}] * 2


def history(rows):
    frame = pd.DataFrame(rows, columns=["event_date_parsed", "fighter_1", "fighter_2", "winner"])
    frame["event_date_parsed"] = pd.to_datetime(frame["event_date_parsed"])
    return frame


def test_resolve_marks_picks_right_wrong_or_neither(log_file, monkeypatch):
    upcoming(monkeypatch, [("Fighter One", "Fighter Two"), ("Fighter Three", "Fighter Four"), ("Fighter Five", "Fighter Six"), ("Fighter Seven", "Fighter Eight")])
    log_predictions.log_upcoming(FakeService(), today="2026-11-01")

    monkeypatch.setattr(
        log_predictions,
        "_load_fight_history",
        lambda: history(
            [
                ("2026-11-07", "Fighter Two", "Fighter One", "Fighter One"),  # picked right (corners swapped in the results)
                ("2026-11-07", "Fighter Three", "Fighter Four", "Fighter Four"),  # picked wrong
                ("2026-11-07", "Fighter Five", "Fighter Six", None),  # draw: counts for nobody
            ]
        ),
    )
    assert log_predictions.resolve(today="2026-11-08") == 3

    log = track_record_service.load_log().set_index("fighter_1")
    assert log.loc["Fighter One", "correct"] == "True"
    assert log.loc["Fighter Three", "correct"] == "False" and log.loc["Fighter Three", "winner"] == "Fighter Four"
    assert log.loc["Fighter Five", "correct"] == "n/a"
    assert log.loc["Fighter Seven", "correct"] == ""  # no result yet: still pending
    assert log_predictions.resolve(today="2026-11-09") == 0  # settled fights are not settled again


def log_rows(log_file):
    rows = []
    for key, event_date, correct, winner in (
        ("future-open", "2026-11-07", "", ""),
        ("future-open-2", "2026-12-05", "", ""),
        ("already-happened", "2026-10-17", "", ""),  # the event took place, its result is just not in yet
        ("settled", "2026-10-10", "True", "Fighter One"),
        ("today", "2026-10-20", "", ""),  # fights may be under way: not touched
    ):
        rows.append(
            {
                "fight_key": key, "event_name": "UFC", "event_date": event_date, "fighter_1": "Fighter One",
                "fighter_2": "Fighter Two", "prob_fighter_1": "0.9500", "predicted_winner": "Fighter Two",
                "confidence": "0.9500", "logged_at": "2026-10-15", "winner": winner, "correct": correct,
                "resolved_at": "2026-10-11" if correct else "",
            }
        )
    track_record_service.save_log(pd.DataFrame(rows, columns=track_record_service.LOG_COLUMNS))


def test_refresh_unresolved_re_predicts_only_fights_still_to_come(log_file):
    log_rows(log_file)

    assert log_predictions.refresh_unresolved(FakeService(), today="2026-10-20") == 2

    log = track_record_service.load_log().set_index("fight_key")
    for key in ("future-open", "future-open-2"):  # re-made with today's model, before the fight
        assert (log.at[key, "predicted_winner"], log.at[key, "confidence"], log.at[key, "logged_at"]) == ("Fighter One", "0.7000", "2026-10-20")
        assert log.at[key, "prob_fighter_1"] == "0.7000"
    for key in ("already-happened", "settled", "today"):  # exactly as they were shown
        assert (log.at[key, "predicted_winner"], log.at[key, "confidence"], log.at[key, "logged_at"]) == ("Fighter Two", "0.9500", "2026-10-15")
    assert log.at["settled", "correct"] == "True"


def test_refresh_unresolved_keeps_the_pick_of_a_fighter_who_left_the_catalog(log_file):
    log_rows(log_file)
    log = track_record_service.load_log()
    log.loc[log["fight_key"] == "future-open", "fighter_2"] = "Unknown"
    track_record_service.save_log(log)

    assert log_predictions.refresh_unresolved(FakeService(), today="2026-10-20") == 1
    kept = track_record_service.load_log().set_index("fight_key").loc["future-open"]
    assert (kept["predicted_winner"], kept["logged_at"]) == ("Fighter Two", "2026-10-15")


def test_each_pick_is_saved_with_the_model_that_made_it(log_file, monkeypatch):
    class Prefight(FakeService):
        model_key = "prefight"

    upcoming(monkeypatch, [("Fighter One", "Fighter Two")])
    log_predictions.log_upcoming(Prefight(), today="2026-11-01")
    upcoming(monkeypatch, [("Fighter Three", "Fighter Four")])
    log_predictions.log_upcoming(FakeService(), today="2026-11-02")  # a service with no model_key is the current model
    assert track_record_service.load_log()["model"].tolist() == ["prefight", "current"]


def test_refreshing_the_unresolved_picks_records_the_new_model(log_file, monkeypatch):
    upcoming(monkeypatch, [("Fighter One", "Fighter Two")])
    log_predictions.log_upcoming(FakeService(), today="2026-11-01")

    class Prefight(FakeService):
        model_key = "prefight"

    assert log_predictions.refresh_unresolved(Prefight(), today="2026-11-02") == 1
    row = track_record_service.load_log().iloc[0]
    assert (row["model"], row["logged_at"]) == ("prefight", "2026-11-02")


def logged(monkeypatch, fights, day="2026-11-07"):
    """Saves a pick for each fight and then takes the card down, as happens once it is over."""
    upcoming(monkeypatch, fights, date=day)
    log_predictions.log_upcoming(FakeService(), today="2026-11-01")
    monkeypatch.setattr(log_predictions, "get_upcoming_events", list)


def results(monkeypatch, rows):
    monkeypatch.setattr(log_predictions, "_load_fight_history", lambda: history(rows))


def outcome(index=0):
    row = track_record_service.load_log().iloc[index]
    return row["correct"], row["winner"]


def test_a_fight_that_never_took_place_is_closed_once_the_results_of_its_day_are_in(log_file, monkeypatch):
    logged(monkeypatch, [("Ana One", "Bia Two")])
    results(monkeypatch, [("2026-10-31", "Other Person", "Someone Else", "Other Person")])
    assert log_predictions.resolve(today="2026-11-30") == 0  # no result of that day yet: the refresh may just be behind

    results(monkeypatch, [("2026-11-07", "Ana One", "Cleo Three", "Ana One")])  # she fought a replacement
    assert log_predictions.resolve(today="2026-11-09") == 0  # too soon
    assert log_predictions.resolve(today="2026-11-10") == 1
    assert outcome() == ("n/a", track_record_service.DID_NOT_HAPPEN)
    assert log_predictions.resolve(today="2026-11-11") == 0  # closed once


def test_a_closed_pick_is_settled_after_all_when_its_result_turns_up(log_file, monkeypatch):
    logged(monkeypatch, [("Ana One", "Bia Two")])
    results(monkeypatch, [("2026-11-07", "Other Person", "Someone Else", "Other Person")])
    log_predictions.resolve(today="2026-11-10")
    results(monkeypatch, [("2026-11-08", "Ana One", "Bia Two", "Bia Two")])  # filed under the next day
    assert log_predictions.resolve(today="2026-11-12") == 1
    assert outcome() == ("False", "Bia Two")


def test_a_rematch_months_later_does_not_settle_the_first_pick(log_file, monkeypatch):
    logged(monkeypatch, [("Ana One", "Bia Two")])
    results(monkeypatch, [("2027-03-01", "Ana One", "Bia Two", "Bia Two")])
    log_predictions.resolve(today="2027-03-02")
    assert outcome() == ("n/a", track_record_service.DID_NOT_HAPPEN)


def test_a_fight_moved_to_a_later_card_closes_the_pick_of_the_first_date(log_file, monkeypatch):
    logged(monkeypatch, [("Ana One", "Bia Two")], day="2026-12-12")
    upcoming(monkeypatch, [("Bia Two", "Ana One")], date="2027-02-13")
    assert log_predictions.log_upcoming(FakeService(), today="2026-11-20") == 1  # the new date gets its own pick
    results(monkeypatch, [("2026-11-07", "Other Person", "Someone Else", "Other Person")])
    assert log_predictions.resolve(today="2026-11-20") == 1
    assert outcome(0) == ("n/a", track_record_service.RESCHEDULED) and outcome(1) == ("", "")


def test_the_same_fight_saved_under_two_spellings_counts_once(log_file, monkeypatch):
    logged(monkeypatch, [("Ana One", "Jose Souza"), ("Ana One", "Jose Henrique")])
    results(monkeypatch, [("2026-11-07", "Jose Souza", "Ana One", "Jose Souza")])
    log_predictions.resolve(today="2026-11-12")
    assert outcome(0) == ("False", "Jose Souza") and outcome(1) == ("n/a", track_record_service.DUPLICATE_PICK)


def test_a_pick_that_may_be_the_fight_under_another_spelling_is_left_open_and_reported(log_file, monkeypatch, capsys):
    logged(monkeypatch, [("Ana One", "Jose Henrique")])
    results(monkeypatch, [("2026-11-07", "Jose Souza", "Ana One", "Jose Souza")])
    assert log_predictions.resolve(today="2026-11-12") == 0
    assert outcome() == ("", "") and "name_aliases.csv" in capsys.readouterr().out
