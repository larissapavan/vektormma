import re
from datetime import date
from pathlib import Path

import joblib

from backend.app.services.data_confidence import assess
from src.ufc_predictor.config import PREFIGHT_MODEL_PATH

TODAY = date(2026, 10, 21)


def fighter(name="A", fights=20, last="2026-06-01", age=30.0, height=180.0, reach=185.0):
    return {"name": name, "total_fights": fights, "ufc_last_fight": last, "age": age, "height_cm": height, "reach_cm": reach}


def test_two_active_veterans_with_full_data_are_solid():
    result = assess(fighter("A"), fighter("B"), today=TODAY)
    assert result == {"level": "solid", "label": "Solid data", "reasons": []}


def test_a_newcomer_makes_the_whole_matchup_thin():
    result = assess(fighter("Rookie", fights=2), fighter("Vet", fights=3, last="2026-09-01"), today=TODAY)
    assert result["level"] == "thin"
    assert any("Rookie has only 2 recorded fights" in reason for reason in result["reasons"])
    assert any("Vet has only 3" in reason for reason in result["reasons"])


def test_a_single_fight_reads_in_the_singular():
    result = assess(fighter("Debut", fights=1), fighter("B"), today=TODAY)
    assert "Debut has only 1 recorded fight," in result["reasons"][0]


def test_a_file_without_career_records_is_not_read_as_a_fighter_with_no_fights():
    result = assess({**fighter("Ayaka", fights=0, last=None), "data_origin": "one"}, fighter("B"), today=TODAY)
    assert result["reasons"][0] == "Ayaka has no career record on file."
    assert not any("only 0" in reason for reason in result["reasons"])


def test_a_long_layoff_is_called_out_and_a_short_one_is_not():
    away = assess(fighter("Away", last="2024-08-01"), fighter("B"), today=TODAY)
    assert away["level"] == "some_gaps"
    assert away["reasons"] == ["Away last fought in the UFC about 2 years ago, so their numbers may not show how they fight today."]
    assert assess(fighter("Back", last="2026-01-01"), fighter("B"), today=TODAY)["level"] == "solid"


def test_a_missing_measurement_is_named():
    result = assess(fighter("A", reach=None), fighter("B", reach=None, height=None), today=TODAY)
    assert result["level"] == "some_gaps"
    assert result["reasons"] == [
        "A has no reach on record, so the model used a typical value.",
        "B has no height or reach on record, so the model used typical values.",
    ]


def test_an_unknown_last_fight_date_adds_nothing():
    assert assess(fighter("A", last=None), fighter("B", last=""), today=TODAY)["level"] == "solid"


def every_reason() -> list[str]:
    """One of each sentence the note can write, in the singular and the plural."""
    other = fighter("B")
    fighters = [
        fighter("A", fights=0), fighter("A", fights=1), fighter("A", fights=5),
        fighter("A", last="2025-09-01"), fighter("A", last="2023-01-01"),
        {**fighter("A"), "data_origin": "pfl"},
        fighter("A", age=None), fighter("A", reach=None, height=None), fighter("A", age=None, height=None, reach=None),
    ]
    reasons = [assess(one, other, today=TODAY)["reasons"] for one in fighters]
    assert all(len(found) == 1 for found in reasons)
    no_record = assess({**fighter("A", fights=0), "data_origin": "one"}, other, today=TODAY)["reasons"]
    return [*(found[0] for found in reasons), no_record[0]]


def test_no_sentence_denies_what_the_served_model_does():
    """The pre-fight model weighs time off and fills gaps with medians, so the note may claim neither the opposite nor averages."""
    bundle = joblib.load(PREFIGHT_MODEL_PATH)
    assert "days_off_diff" in bundle["feature_columns"]
    assert bundle["model"].named_steps["imputer"].strategy == "median"
    for reason in every_reason():
        assert not re.search(r"ring rust|average", reason), reason


def test_the_site_can_translate_every_sentence():
    """confidenceText.ts finds a sentence by its exact English wording; one it does not know would stay in English."""
    source = (Path(__file__).parents[2] / "frontend/src/shared/data/confidenceText.ts").read_text(encoding="utf-8")
    patterns = [re.compile(found) for found in re.findall(r"^    /(\^.+\$)/,$", source, flags=re.MULTILINE)]
    assert len(patterns) == 6
    for reason in every_reason():
        assert sum(bool(pattern.match(reason)) for pattern in patterns) == 1, reason
