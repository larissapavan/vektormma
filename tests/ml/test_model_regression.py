"""A retrain, new features or a data change must not quietly make the model worse.

The pre-fight candidate is trained here from the repository's own files (about two minutes, nothing is written) and its
numbers on the newest fights are held to floors set a few points below where it stands today. They are loose on
purpose: the test block moves a little with every daily refresh, so a floor tight to the current value would fail for
no reason. A real regression (a leak removed, a feature broken, calibration lost) falls well below them.
"""

import pytest

from backend.app.services.model_evaluation import load_recent_evaluation
from src.ufc_predictor import train_prefight
from src.ufc_predictor.prefight import build_from_repository

pytestmark = pytest.mark.model_regression

CANDIDATE_FLOORS = {"accuracy": 0.58, "roc_auc": 0.62}
CANDIDATE_CEILINGS = {"log_loss": 0.68, "brier": 0.243, "ece": 0.05}  # always-50/50 is 0.693 log loss and 0.250 Brier
DEPLOYED_ACCURACY_FLOOR = 0.58
DEPLOYED_ECE_CEILING = 0.12  # it is overconfident today (about 0.09); this catches it getting worse


@pytest.fixture(scope="module")
def candidate_result():
    data, _, _ = build_from_repository()
    return train_prefight.run(data)


def test_the_candidate_keeps_its_accuracy_and_ranking_power(candidate_result):
    metrics = candidate_result.test_metrics["chosen"]
    for name, floor in CANDIDATE_FLOORS.items():
        assert metrics[name] >= floor, f"{name} fell to {metrics[name]:.3f}, below {floor}"


def test_the_candidate_keeps_honest_probabilities(candidate_result):
    metrics = candidate_result.test_metrics["chosen"]
    for name, ceiling in CANDIDATE_CEILINGS.items():
        assert metrics[name] <= ceiling, f"{name} rose to {metrics[name]:.3f}, above {ceiling}"


def test_the_candidate_still_beats_the_coin_flip_and_stays_calibrated(candidate_result):
    results = candidate_result.test_metrics
    assert results["chosen"]["log_loss"] < results["dummy_prior"]["log_loss"]
    assert results["chosen"]["ece"] <= results["chosen_raw"]["ece"] + 0.01  # calibration did not make it worse


def test_the_candidate_is_no_worse_than_its_parts_and_the_simple_rules(candidate_result):
    results = candidate_result.test_metrics
    for name in ("higher_elo", "more_wins", "younger"):
        assert results["chosen"]["accuracy"] > results[name]["accuracy"]
    assert results["chosen"]["log_loss"] <= results["frozen_boosting"]["log_loss"]
    assert results["chosen"]["log_loss"] <= results["gradient_boosting"]["log_loss"] + 0.002


def test_the_saved_members_learned_every_fight_but_the_test_did_not_use_them(candidate_result):
    assert len(candidate_result.models) == len(train_prefight.KINDS[candidate_result.kind])
    in_sample = train_prefight.average_probability(candidate_result.models, candidate_result.split.test)
    y = candidate_result.split.test["y"].to_numpy()
    # The saved model has seen the test fights, so it does better on them: the report must not be scored with it.
    assert train_prefight.metrics(in_sample, y)["log_loss"] < candidate_result.test_metrics["chosen"]["log_loss"]


def test_the_deployed_model_still_beats_every_simple_rule():
    evaluation = load_recent_evaluation()
    assert evaluation is not None, "run python -m scripts.compare_models to write models/ufc_winner_model.evaluation.json"
    assert evaluation["accuracy"] >= DEPLOYED_ACCURACY_FLOOR
    assert evaluation["ece"] <= DEPLOYED_ECE_CEILING
    for rule in evaluation.get("baselines", []):
        assert evaluation["accuracy"] > rule["accuracy"], f"'{rule['label']}' ({rule['accuracy']:.1%}) is no longer beaten"
