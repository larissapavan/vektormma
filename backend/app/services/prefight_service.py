"""The pre-fight model behind the same interface as PredictionService.

The API serves it only when the environment variable PREDICTION_MODEL is "prefight"; without it (or with any other value)
build_prediction_service() returns the current model, and a pre-fight model that cannot be loaded falls back to the
current one instead of taking the site down.

What differs from the current model:
    - A matchup is described the way the model was trained (src/ufc_predictor/prefight.py): the history of both fighters
      is replayed from data/raw once at start-up, and "today" is asked of it. The catalog's career totals are not used.
    - The probability is calibrated with one temperature stored in the model file. It has no intercept, so 50% stays 50%
      and p(A, B) + p(B, A) is still exactly 1.
    - There are no corners, so SHAP's two orders line up column for column.
"""

from __future__ import annotations

import logging
import math
import os
from datetime import date, timedelta

import joblib
import numpy as np
import pandas as pd

from backend.app.utils.constants import PREFIGHT_HIGHLIGHTS, PREFIGHT_LIMITATIONS, PREFIGHT_MODEL_NAME
from src.ufc_predictor.config import PREFIGHT_MODEL_PATH, RAW_DATA_DIR
from src.ufc_predictor.prefight import (
    FEATURE_COLUMNS, FighterState, Static, build_statics, calibrate, load_fights, load_raw, matchup_row, name_key, replay,
    weight_features,
)

from .prediction_service import PredictionService, _model_number

logger = logging.getLogger(__name__)

MODEL_ENV_VAR = "PREDICTION_MODEL"
CURRENT, PREFIGHT = "current", "prefight"
STANCES = {"orthodox", "southpaw", "switch"}
TITLE_FIGHT_ROUNDS = 5.0


def _month(iso_day: str) -> str:
    return date.fromisoformat(iso_day).strftime("%B %Y")


def _heavier_division(*divisions: str | None) -> str:
    """The division of a pair that does not depend on the order: the heavier one, then the first alphabetically."""
    def limit(division: str) -> float:
        lbs = weight_features(division)[0]
        return 0.0 if math.isnan(lbs) else lbs

    return max(sorted(d for d in divisions if d), key=limit, default="")


class PrefightPredictionService(PredictionService):
    def __init__(self, model_path=PREFIGHT_MODEL_PATH, raw_dir=RAW_DATA_DIR) -> None:
        if not model_path.exists():
            raise FileNotFoundError(
                f"Pre-fight model not found at {model_path}. Write it with python -m src.ufc_predictor.train_prefight --promote."
            )
        bundle = joblib.load(model_path)
        if list(bundle["feature_columns"]) != FEATURE_COLUMNS:
            raise ValueError("The pre-fight model was trained on other columns than src/ufc_predictor/prefight.py builds: retrain it.")

        self.model = bundle["model"]
        self.feature_columns: list[str] = bundle["feature_columns"]
        self.metrics: dict = bundle.get("metrics", {})
        self.baseline_metrics: dict = bundle.get("baseline_metrics", {})
        self.shap_background = bundle.get("shap_background")
        self.temperature = float(bundle["calibration"]["temperature"])
        self.recent_evaluation = bundle.get("evaluation")
        self.shap_explainer = self._build_shap_explainer()

        tables = load_raw(raw_dir)
        fights = load_fights(tables.cards, tables.details, tables.stats, tables.aliases)
        self._aliases = tables.aliases
        self._statics = build_statics(tables.fighters, tables.career, tables.aliases)
        self._tracker = replay(fights)
        logger.info("Pre-fight history replayed: %d fights, temperature %.2f.", len(fights), self.temperature)

    # ------------------------------------------------------------------ one matchup -> one row per order

    def _key(self, name: str) -> str:
        key = name_key(name)
        return self._aliases.get(key, key)

    def _fighter(self, profile: dict, on: date) -> tuple[FighterState, Static]:
        """A fighter's history before today and the attributes that do not change. A fighter the history has no static
        record for (a debutant, a name two fighters share) is described by the catalog profile instead."""
        key = self._key(profile["name"])
        static = self._statics.get(key)
        if static is None:
            age = _model_number(profile.get("age"), default=math.nan)
            stance = str(profile.get("stance") or "").strip()
            static = Static(
                dob=None if math.isnan(age) else on - timedelta(days=round(age * 365.25)),
                height=_model_number(profile.get("height_cm"), default=math.nan),
                reach=_model_number(profile.get("reach_cm"), default=math.nan),
                stance=stance if stance.lower() in STANCES else "",
            )
        return self._tracker.snapshot(key), static

    @staticmethod
    def _fight_context(fighter_a: dict, fighter_b: dict, context: dict | None) -> dict:
        """What the fight adds. The same for both orders, so the answer cannot depend on who is listed first."""
        context = context or {}
        title = float(bool(context.get("title_fight")))
        rounds = context.get("num_rounds")
        return {
            "scheduled_rounds": float(rounds) if rounds else (TITLE_FIGHT_ROUNDS if title else math.nan),
            "title_fight": title,
            "weight_class": context.get("weight_class") or _heavier_division(fighter_a.get("division"), fighter_b.get("division")),
        }

    def _both_orders(self, fighter_a: dict, fighter_b: dict, context: dict | None = None) -> tuple[pd.DataFrame, pd.DataFrame]:
        on = date.today()
        state_a, static_a = self._fighter(fighter_a, on)
        state_b, static_b = self._fighter(fighter_b, on)
        fight = self._fight_context(fighter_a, fighter_b, context)
        forward = matchup_row(state_a, static_a, state_b, static_b, on, **fight)
        backward = matchup_row(state_b, static_b, state_a, static_a, on, **fight)
        return pd.DataFrame([forward])[self.feature_columns], pd.DataFrame([backward])[self.feature_columns]

    # ------------------------------------------------------------------ probability and explanation

    def _symmetric_probability(self, x_ab: pd.DataFrame, x_ba: pd.DataFrame) -> float:
        """Chance that the first fighter wins: both orders averaged, then calibrated with the stored temperature."""
        probabilities = self.model.predict_proba(pd.concat([x_ab, x_ba], ignore_index=True))[:, 1]
        raw = (float(probabilities[0]) + 1.0 - float(probabilities[1])) / 2.0
        return float(calibrate(np.array([raw]), self.temperature)[0])

    def _combined_attributions(self, x_ab: pd.DataFrame, x_ba: pd.DataFrame) -> np.ndarray | None:
        """Each feature's push toward the first fighter. There are no corners, so a feature is the same column in both
        orders; the second order points toward B and is negated. The pushes add up to the uncalibrated p - 0.5 (SHAP is
        only approximately additive), a little less than the calibrated probability moves."""
        if self.shap_explainer is None:
            return None
        imputed = self.model.named_steps["imputer"].transform(pd.concat([x_ab, x_ba], ignore_index=True))
        values = self.shap_explainer(imputed).values
        return 0.5 * (values[0] - values[1])

    # ------------------------------------------------------------------ what the site shows about the model

    def model_info(self) -> dict:
        evaluation = self.recent_evaluation
        note = None
        if evaluation:
            note = (
                f"Measured once on {evaluation['fights']:,} fights ({_month(evaluation['start'])} to {_month(evaluation['end'])}), all later than "
                "the fights it trained on, each fighter described as of the morning of the fight. "
                f"It picked the winner {evaluation['accuracy']:.1%} of the time; its confidence was calibrated on a separate block of earlier fights."
            )
        return {
            "model_name": PREFIGHT_MODEL_NAME,
            "feature_count": len(self.feature_columns),
            "metrics": self.metrics,
            "baseline_metrics": self.baseline_metrics,
            "features": self.feature_columns,
            "highlights": PREFIGHT_HIGHLIGHTS,
            "limitations": PREFIGHT_LIMITATIONS,
            "metrics_note": note,
            "recent_evaluation": evaluation,
        }


def selected_model() -> str:
    value = os.getenv(MODEL_ENV_VAR, CURRENT).strip().lower() or CURRENT
    if value not in {CURRENT, PREFIGHT}:
        logger.warning("%s=%r is not one of %s, %s: serving the current model.", MODEL_ENV_VAR, value, CURRENT, PREFIGHT)
        return CURRENT
    return value


def build_prediction_service() -> PredictionService:
    """The service the API starts with: the current model unless PREDICTION_MODEL=prefight (and it loads)."""
    if selected_model() == PREFIGHT:
        try:
            service = PrefightPredictionService()
            logger.info("Serving the pre-fight model (%s=%s).", MODEL_ENV_VAR, PREFIGHT)
            return service
        except Exception:
            logger.exception("%s=%s but the pre-fight model could not be loaded: serving the current model.", MODEL_ENV_VAR, PREFIGHT)
    return PredictionService()
