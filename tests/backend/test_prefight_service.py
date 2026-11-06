"""The pre-fight model is served unless PREDICTION_MODEL=current, and it answers like the current one: the same
probability whichever fighter is typed first, a pick that matches the full prediction, and factors that add up."""

import math
import re
from datetime import date
from pathlib import Path

import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.rate_limit import limiter
from backend.app.routers.meta import build_meta_router
from backend.app.routers.prediction import _predict_all_upcoming, build_prediction_router
from backend.app.schemas.model_info import ModelInfoResponse
from backend.app.services import prefight_service
from backend.app.services.prefight_service import PrefightPredictionService, build_prediction_service, selected_model
from backend.app.utils.constants import PREFIGHT_HIGHLIGHTS, PREFIGHT_LIMITATIONS
from src.ufc_predictor.config import PREFIGHT_MODEL_PATH
from src.ufc_predictor.prefight import FEATURE_COLUMNS, calibrate

TOLERANCE = 1e-9
SHAP_SUM_CEILING = 0.06  # SHAP's probability output is only approximately additive (see test_prediction_symmetry)

PAIRS = [
    ("Islam Makhachev", "Arman Tsarukyan"),
    ("Jon Jones", "Tom Aspinall"),
    ("Alex Pereira", "Magomed Ankalaev"),
    ("Sean O'Malley", "Merab Dvalishvili"),
]


@pytest.fixture(scope="module")
def service() -> PrefightPredictionService:
    return PrefightPredictionService()


# --------------------------------------------------------------------------- which model is served


class _Current:
    pass


class _Prefight:
    pass


@pytest.fixture
def stand_ins(monkeypatch):
    monkeypatch.setattr(prefight_service, "PredictionService", _Current)
    monkeypatch.setattr(prefight_service, "PrefightPredictionService", _Prefight)


def test_the_prefight_model_is_the_default(monkeypatch, stand_ins):
    monkeypatch.delenv("PREDICTION_MODEL", raising=False)
    assert selected_model() == "prefight"
    assert isinstance(build_prediction_service(), _Prefight)


@pytest.mark.parametrize("value", ["", "  ", "something-else"])
def test_an_empty_or_unknown_value_means_the_default(monkeypatch, stand_ins, value):
    monkeypatch.setenv("PREDICTION_MODEL", value)
    assert selected_model() == "prefight"
    assert isinstance(build_prediction_service(), _Prefight)


@pytest.mark.parametrize("value", ["current", " Current "])
def test_current_keeps_the_earlier_model(monkeypatch, stand_ins, value):
    monkeypatch.setenv("PREDICTION_MODEL", value)
    assert selected_model() == "current"
    assert isinstance(build_prediction_service(), _Current)


@pytest.mark.parametrize("value", ["prefight", " PreFight "])
def test_prefight_serves_the_prefight_model(monkeypatch, stand_ins, value):
    monkeypatch.setenv("PREDICTION_MODEL", value)
    assert isinstance(build_prediction_service(), _Prefight)


def test_a_prefight_model_that_cannot_load_falls_back_to_the_current_one(monkeypatch, stand_ins):
    def broken():
        raise FileNotFoundError("no model file")

    monkeypatch.delenv("PREDICTION_MODEL", raising=False)
    monkeypatch.setattr(prefight_service, "PrefightPredictionService", broken)
    assert isinstance(build_prediction_service(), _Current)


def test_the_promoted_model_file_is_in_the_repository():
    assert PREFIGHT_MODEL_PATH.exists()


def test_every_sentence_the_prefight_model_sends_is_translated_on_the_site():
    """frontend/src/shared/data/apiText.ts puts the API's English sentences in pt, fr and es; a sentence it does not
    know is shown in English. Each sentence must be a key there with all three languages."""
    source = (Path(__file__).resolve().parents[2] / "frontend" / "src" / "shared" / "data" / "apiText.ts").read_text(encoding="utf-8")
    for sentence in [*PREFIGHT_HIGHLIGHTS, *PREFIGHT_LIMITATIONS]:
        escaped = sentence.replace("'", "\\'")  # the TypeScript keys are single-quoted strings
        entry = re.search(re.escape(f"'{escaped}': {{") + r"\s+pt: .+\s+fr: .+\s+es: .+\s+\}", source)
        assert entry, f"apiText.ts has no pt/fr/es entry for: {sentence}"


# --------------------------------------------------------------------------- the answer does not depend on the order


@pytest.mark.parametrize(("a", "b"), PAIRS)
def test_the_probability_is_the_same_in_both_orders(service, a, b):
    forward, backward = service.predict_matchup(a, b), service.predict_matchup(b, a)
    assert abs(forward["fighter_a_probability"] + forward["fighter_b_probability"] - 1.0) < TOLERANCE
    assert abs(forward["fighter_a_probability"] - backward["fighter_b_probability"]) < TOLERANCE
    assert forward["predicted_winner"] == backward["predicted_winner"]


@pytest.mark.parametrize(("a", "b"), PAIRS)
def test_the_pick_matches_the_full_prediction(service, a, b):
    pick, full = service.predict_pick(a, b), service.predict_matchup(a, b)
    assert pick["predicted_winner"] == full["predicted_winner"]
    assert abs(pick["fighter_a_probability"] - full["fighter_a_probability"]) < TOLERANCE
    assert abs(service.predict_pick(b, a)["fighter_a_probability"] + pick["fighter_a_probability"] - 1.0) < TOLERANCE


@pytest.mark.parametrize(("a", "b"), PAIRS)
def test_the_factors_are_the_same_in_both_orders_and_add_up(service, a, b):
    forward, backward = service.predict_matchup(a, b), service.predict_matchup(b, a)
    assert forward["main_factors"] and len(forward["main_factors"]) == len(backward["main_factors"])
    key = lambda factors: sorted((f["feature"], f["impact"], round(f["magnitude"], 9)) for f in factors)  # noqa: E731
    assert key(forward["main_factors"]) == key(backward["main_factors"])

    from backend.app.services.catalog_service import get_fighter_profile

    x_ab, x_ba = service._both_orders(get_fighter_profile(a), get_fighter_profile(b))
    total = service._combined_attributions(x_ab, x_ba).sum()
    raw = service.model.predict_proba(x_ab)[:, 1][0], service.model.predict_proba(x_ba)[:, 1][0]
    assert abs(total - ((raw[0] + 1 - raw[1]) / 2 - 0.5)) < SHAP_SUM_CEILING
    assert abs(total + service._combined_attributions(x_ba, x_ab).sum()) < TOLERANCE


def test_both_orders_see_the_fight_in_the_same_way(service):
    from backend.app.services.catalog_service import get_fighter_profile

    x_ab, x_ba = service._both_orders(get_fighter_profile("Islam Makhachev"), get_fighter_profile("Arman Tsarukyan"), {"title_fight": True})
    assert list(x_ab.columns) == FEATURE_COLUMNS == list(x_ba.columns)
    differences = [c for c in FEATURE_COLUMNS if c.endswith("_diff")]
    shared = [c for c in FEATURE_COLUMNS if c not in differences]
    np.testing.assert_allclose(x_ab[differences].to_numpy(dtype=float), -x_ba[differences].to_numpy(dtype=float), equal_nan=True)
    np.testing.assert_allclose(x_ab[shared].to_numpy(dtype=float), x_ba[shared].to_numpy(dtype=float), equal_nan=True)
    assert x_ab.at[0, "title_fight"] == 1.0
    assert x_ab.at[0, "scheduled_rounds"] == 5.0  # nothing said about the rounds: a title fight is five


# --------------------------------------------------------------------------- calibration


def test_the_probability_is_the_stored_temperature_applied_to_the_two_order_average(service):
    from backend.app.services.catalog_service import get_fighter_profile

    x_ab, x_ba = service._both_orders(get_fighter_profile("Alex Pereira"), get_fighter_profile("Magomed Ankalaev"))
    forward, backward = service.model.predict_proba(x_ab)[0, 1], service.model.predict_proba(x_ba)[0, 1]
    raw = (forward + 1 - backward) / 2
    expected = calibrate(np.array([raw]), service.temperature)[0]
    assert service._symmetric_probability(x_ab, x_ba) == pytest.approx(expected, abs=TOLERANCE)
    assert service.temperature != 1.0  # a calibration was fitted, not left at the identity


# --------------------------------------------------------------------------- fighters the history does not know


def test_a_fighter_without_history_is_read_from_the_catalog_profile(service):
    profile = {"name": "Nobody Atall", "age": 30.0, "height_cm": 180.0, "reach_cm": 185.0, "stance": "Southpaw"}
    state, static = service._fighter(profile, date(2026, 11, 1))
    assert state.fights == 0 and state.elo == 1500.0
    assert static.stance == "Southpaw" and static.height == 180.0 and static.dob.year == 1996


def test_a_fighter_with_unknown_measures_gets_blanks_not_made_up_numbers(service):
    state, static = service._fighter({"name": "Nobody Atall", "age": None, "height_cm": None, "reach_cm": None, "stance": "Unknown"}, date(2026, 11, 1))
    assert static.dob is None and math.isnan(static.height) and math.isnan(static.reach) and static.stance == ""


def _made_up(**changes) -> dict:
    profile = {
        "name": "Vektor Career Player", "age": 26.0, "height_cm": 178.0, "reach_cm": 183.0, "stance": "Orthodox",
        "wins": 0, "losses": 0, "draws": 0, "sig_str_acc": 0.45, "takedown_acc": 0.38, "synthetic": True,
    }
    return {**profile, **changes}


def test_a_made_up_fighter_reads_the_accuracies_and_the_record_of_its_profile(service):
    state, _ = service._fighter(_made_up(wins=6, losses=1, sig_str_acc=0.60, takedown_acc=0.20), date(2026, 11, 1))
    assert (state.fights, state.wins, state.losses) == (7, 6, 1)
    assert state.elo > 1500.0
    assert state.stat_fights > 0 and state.minutes > 0
    # The accuracy the model computes from this history is the one in the profile.
    from src.ufc_predictor.prefight import fighter_features

    _, static = service._fighter(_made_up(), date(2026, 11, 1))
    features = fighter_features(state, static, date(2026, 11, 1))
    assert features["sig_acc"] == pytest.approx(0.60, abs=1e-6)
    assert features["td_acc"] == pytest.approx(0.20, abs=1e-6)


def test_a_made_up_fighter_with_better_skills_is_given_a_better_chance(service):
    from backend.app.services.catalog_service import get_fighter_profile

    rival = get_fighter_profile("Charlie Campbell")
    weak = service.predict_profiles(_made_up(sig_str_acc=0.30, takedown_acc=0.10), rival)
    strong = service.predict_profiles(_made_up(sig_str_acc=0.60, takedown_acc=0.65), rival)
    assert strong > weak + 0.05


def test_a_fighter_that_is_not_marked_made_up_never_gets_a_history_it_does_not_have(service):
    state, _ = service._fighter(_made_up(synthetic=False, wins=6, sig_str_acc=0.60), date(2026, 11, 1))
    assert state.fights == 0 and state.stat_fights == 0


def test_the_weight_class_of_a_pair_does_not_depend_on_the_order():
    heavier = prefight_service._heavier_division
    assert heavier("Lightweight", "Welterweight") == heavier("Welterweight", "Lightweight") == "Welterweight"
    assert heavier(None, "Flyweight") == "Flyweight"
    assert heavier(None, None) == ""


# --------------------------------------------------------------------------- what the site is told


def test_the_model_info_is_valid_and_describes_the_prefight_model(service):
    info = service.model_info()
    parsed = ModelInfoResponse(**info)
    assert parsed.feature_count == len(FEATURE_COLUMNS) == 29
    assert "pre-fight" in parsed.model_name
    assert parsed.recent_evaluation and parsed.recent_evaluation.fights > 1000
    assert parsed.recent_evaluation.calibration and parsed.recent_evaluation.baselines
    assert parsed.metrics_note.startswith("Measured once on ")
    assert parsed.limitations[-1] == "This is a personal project for learning, not betting advice."
    assert 0.55 < parsed.metrics["accuracy"] < 0.75  # honest, not the 75% the current model's file reports


def test_the_endpoints_work_with_the_prefight_service(service):
    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(build_prediction_router(lambda: service))
    app.include_router(build_meta_router(lambda: service))
    client = TestClient(app)

    response = client.post("/predict", json={"fighter_a": "Islam Makhachev", "fighter_b": "Arman Tsarukyan"})
    assert response.status_code == 200 and 0.5 <= response.json()["probability"] <= 1.0
    assert client.get("/model-info").json()["model_name"].endswith("(pre-fight)")
    assert client.post("/predict", json={"fighter_a": "Islam Makhachev", "fighter_b": "Nobody Atall"}).status_code == 404


def test_the_upcoming_picks_are_consistent(service):
    """Runs the cards' weight class, title flag and rounds through the model; the cards change, so only the shape is held."""
    for pick in _predict_all_upcoming(service):
        assert pick.probability == pytest.approx(max(pick.fighter_1_probability, 1 - pick.fighter_1_probability))
        assert pick.predicted_winner in (pick.fighter_1, pick.fighter_2)
        assert (pick.predicted_winner == pick.fighter_1) == (pick.fighter_1_probability >= 0.5)
