"""Predictions for fighters who come from another organization's own file (PFL, Bellator, ONE...).

The model is trained on UFC fights. Those files carry a record, age, height and reach but no striking or takedown numbers,
so for PFL, Bellator and ONE the probability is pulled toward 50% (PROBABILITY_SHRINK) and the data note says why.
"""

from datetime import date

import pytest

from backend.app.services import org_service, prediction_service
from backend.app.services.data_confidence import assess
from backend.app.services.prediction_service import EASED_ORIGINS, PROBABILITY_SHRINK, PredictionService, _eased

TODAY = date(2026, 11, 3)


def profile(name: str, origin: str | None = None) -> dict:
    return {
        "name": name, "age": 30.0, "height_cm": 180.0, "reach_cm": 185.0, "wins": 12, "losses": 2, "total_fights": 14,
        "win_rate": 12 / 14, "sig_str_acc": 0.45, "takedown_acc": 0.40, "stance": "Orthodox", "ufc_last_fight": None,
        **({"data_origin": origin} if origin else {}),
    }


def test_a_fighter_from_the_pfl_or_bellator_file_pulls_the_probability_toward_even():
    assert _eased(0.9, profile("A", "pfl"), profile("B")) == pytest.approx(0.5 + 0.4 * PROBABILITY_SHRINK)
    assert _eased(0.2, profile("A"), profile("B", "bellator")) == pytest.approx(0.5 - 0.3 * PROBABILITY_SHRINK)


def test_two_ufc_fighters_and_other_organizations_are_left_as_the_model_gave_them():
    assert _eased(0.9, profile("A"), profile("B")) == 0.9
    assert _eased(0.9, profile("A", "rizin"), profile("B")) == 0.9
    assert EASED_ORIGINS == {"pfl", "bellator", "one"}


def test_a_fighter_from_the_one_file_is_pulled_too():
    assert _eased(0.9, profile("A", "one"), profile("B")) == pytest.approx(0.5 + 0.4 * PROBABILITY_SHRINK)


def test_the_pull_never_changes_who_the_model_favours():
    for raw in (0.01, 0.3, 0.49, 0.51, 0.7, 0.99):
        eased = _eased(raw, profile("A", "pfl"), profile("B", "pfl"))
        assert (eased > 0.5) == (raw > 0.5)
        assert abs(eased - 0.5) < abs(raw - 0.5)


def test_the_data_note_names_a_fighter_whose_striking_numbers_are_averages():
    result = assess(profile("Cris", "pfl"), profile("Dana"), today=TODAY)
    assert result["level"] == "some_gaps"
    assert result["reasons"] == ["Cris has no striking or takedown numbers on file outside the UFC, so the model used averages for them."]


@pytest.fixture(scope="module")
def service() -> PredictionService:
    return PredictionService()


def test_the_pick_and_the_full_prediction_both_show_the_pulled_probability(service, monkeypatch):
    def fake_profiles(origin_a, origin_b):
        profiles = {"Cris": profile("Cris", origin_a), "Dana": {**profile("Dana", origin_b), "wins": 3, "losses": 9, "total_fights": 12, "win_rate": 0.25}}
        monkeypatch.setattr(prediction_service, "get_fighter_profile", lambda name: profiles[name])

    fake_profiles(None, None)
    raw_pick, raw_full = service.predict_pick("Cris", "Dana"), service.predict_matchup("Cris", "Dana")
    assert raw_pick["fighter_a_probability"] == pytest.approx(raw_full["fighter_a_probability"])
    raw_edge = raw_pick["fighter_a_probability"] - 0.5
    assert abs(raw_edge) > 0.1  # a lopsided pair, so the pull is easy to see

    fake_profiles("pfl", None)
    pick, full = service.predict_pick("Cris", "Dana"), service.predict_matchup("Cris", "Dana")
    assert pick["fighter_a_probability"] - 0.5 == pytest.approx(raw_edge * PROBABILITY_SHRINK)
    assert full["fighter_a_probability"] == pytest.approx(pick["fighter_a_probability"])
    assert full["fighter_a_probability"] + full["fighter_b_probability"] == pytest.approx(1.0)
    assert full["predicted_winner"] == raw_full["predicted_winner"]


# --------------------------------------------------------------------------- which bouts get a pick

class FakeService:
    def predict_pick(self, fighter_1, fighter_2):
        return {"predicted_winner": fighter_1, "probability": 0.6, "fighter_a_probability": 0.6}


def picks_for(monkeypatch, org_id, discipline):
    fight = {"fighter_1": "Cris", "fighter_2": "Dana", "title_fight": None, **({"discipline": discipline} if discipline is not None else {})}
    monkeypatch.setattr(org_service, "get_org_upcoming_events", lambda _org: [{"name": "Card", "date": "2030-01-01", "fights": [fight]}])
    return org_service.get_org_upcoming_predictions(org_id, FakeService())


def test_a_pfl_or_bellator_bout_gets_a_pick_although_their_files_have_no_sport_column(monkeypatch):
    assert len(picks_for(monkeypatch, "pfl", None)) == 1
    assert len(picks_for(monkeypatch, "bellator", None)) == 1


def test_a_bout_that_names_another_sport_gets_no_pick_anywhere(monkeypatch):
    assert picks_for(monkeypatch, "pfl", "Kickboxing") == []
    assert picks_for(monkeypatch, "one", "Muay Thai") == []
    assert len(picks_for(monkeypatch, "one", "MMA")) == 1


def test_an_organization_that_does_not_name_the_sport_and_is_not_mma_only_gets_no_pick(monkeypatch):
    assert picks_for(monkeypatch, "one", None) == []
    assert picks_for(monkeypatch, "rizin", None) == []
