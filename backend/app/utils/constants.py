from __future__ import annotations

MODEL_NAME = "HistGradientBoostingClassifier"

MODEL_LIMITATIONS = [
    "Predictions are estimates based on past fights and each fighter's career stats.",
    "The model uses each fighter's current career numbers, not their numbers at the time of past fights.",
    "This is a personal project for learning, not betting advice.",
]

MODEL_HIGHLIGHTS = [
    "It was tested on fights that came after the ones it trained on, as a real prediction would be.",
    "Most inputs are differences between the two fighters, such as win rate, reach, age and striking accuracy.",
    "SHAP shows which stats pushed each prediction toward one fighter or the other.",
]

PREFIGHT_MODEL_NAME = "HistGradientBoostingClassifier (pre-fight)"

# These sentences are translated on the site (frontend/src/shared/data/apiText.ts): change both together.
PREFIGHT_HIGHLIGHTS = [
    "Each fight is described by what was known on the morning of the fight: only earlier fights count, never its own result or anything after it.",
    "It was tested on the newest fights, all later than every fight it trained on, and its confidence was calibrated on a separate block in between.",
    "Every probability is the average of both fighter orders, so it does not change with who is listed first.",
    "SHAP shows which stats pushed each prediction toward one fighter or the other.",
]

PREFIGHT_LIMITATIONS = [
    "Only past UFC fights are counted. A fighter's record in other organizations is not in the model, so a debutant is read from age, height and reach alone.",
    "Striking and takedown history only exists for fights with published statistics; where it is missing, the model fills in typical values.",
    "Fights are hard to call: a pick is an estimate, and upsets are common.",
    "This is a personal project for learning, not betting advice.",
]

SYSTEM_TAGLINE = (
    "UFC fight stats, rankings and win predictions, with an explanation for every pick."
)
