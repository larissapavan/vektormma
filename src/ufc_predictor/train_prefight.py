"""Train a winner model on features known before each fight, with an honest test.

    python -m src.ufc_predictor.train_prefight

One command, nothing from outside the repository. It reads the CSV files in data/raw (see prefight.py), rebuilds every
fight as it looked before the bell, and writes:

    models/candidate/ufc_prefight_model.joblib    the candidate model; the deployed model is not touched
    docs/prefight-model-report.md                 data, split, results and calibration

With --promote it also writes models/ufc_prefight_model.joblib, the file the API serves by default
(backend/app/services/prefight_service.py), and models/ufc_prefight_backtest.csv, what the test said about each fight. With PREDICTION_MODEL=current it serves models/ufc_winner_model.joblib instead.

How the data is cut. Fights are split by date, never by row position or at random:
    earlier fights   the oldest 80% (cut on a day, so one event is never split). Everything is decided here: from
                     SELECTION_START on, each year is predicted by models that saw only the years before it. Those
                     predictions pick the settings and the kind of model, and fit the one calibration number.
    test             the newest 20%, predicted in blocks of six months, each by a model trained on everything before it.

The model that is saved is then trained once more on every fight there is, test block included: that is how it will be used,
and it is the same procedure the test measured. Run this again now and then to teach it the newest fights.

Fighter A and B are drawn at random per fight (prefight.a_is_first), the training rows are also shown mirrored, and a
probability is always the average of both orders, so the answer cannot depend on who is called A.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.optimize import minimize_scalar
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .config import BASE_DIR, MODEL_DIR, PREFIGHT_BACKTEST_PATH, PREFIGHT_MODEL_PATH
from .prefight import FEATURE_COLUMNS, RESULT_COLUMNS, RESULTS_FACTOR, build_from_repository, calibrate, logit, mirror  # noqa: F401 (re-exported)

SEED = 42
TRAIN_END_QUANTILE = 0.65
CALIBRATION_END_QUANTILE = 0.80
SELECTION_START = "2014-01-01"
SELECTION_STEP_MONTHS = 12
TEST_STEP_MONTHS = 6
# What the track record writes next to the picks of this model (see backend/app/services/track_record_service.py).
MODEL_KEY = "prefight2"
CANDIDATE_PATH = MODEL_DIR / "candidate" / "ufc_prefight_model.joblib"
REPORT_PATH = BASE_DIR / "docs" / "prefight-model-report.md"
CONFIDENCE_BANDS = [(0.5, 0.55), (0.55, 0.6), (0.6, 0.65), (0.65, 0.7), (0.7, 0.8), (0.8, 0.9), (0.9, 1.0001)]

# Settings tried on the earlier fights; the one with the lowest log loss there is used. (max_depth, learning_rate, max_iter, l2)
HGB_SETTINGS = [(2, 0.05, 200, 5.0), (3, 0.05, 200, 5.0), (3, 0.03, 300, 10.0), (4, 0.03, 300, 10.0), (4, 0.02, 400, 20.0)]


# --------------------------------------------------------------------------- split


@dataclass
class Split:
    train: pd.DataFrame
    calibration: pd.DataFrame
    test: pd.DataFrame
    train_end: pd.Timestamp
    calibration_end: pd.Timestamp


def split_by_date(data: pd.DataFrame) -> Split:
    train_end = data["date"].quantile(TRAIN_END_QUANTILE)
    calibration_end = data["date"].quantile(CALIBRATION_END_QUANTILE)
    return Split(
        train=data[data["date"] < train_end],
        calibration=data[(data["date"] >= train_end) & (data["date"] < calibration_end)],
        test=data[data["date"] >= calibration_end],
        train_end=train_end,
        calibration_end=calibration_end,
    )


# --------------------------------------------------------------------------- models, symmetric probabilities, calibration


def hgb_pipeline(depth: int, learning_rate: float, iterations: int, l2: float) -> Pipeline:
    # The step names match what the API reads from a model file (imputer, classifier).
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
        ("classifier", HistGradientBoostingClassifier(
            max_depth=depth, learning_rate=learning_rate, max_iter=iterations, l2_regularization=l2, random_state=SEED)),
    ])


def baselines() -> dict[str, Pipeline]:
    imputer = lambda: SimpleImputer(strategy="median", keep_empty_features=True)  # noqa: E731
    return {
        "dummy_prior": Pipeline([("imputer", imputer()), ("classifier", DummyClassifier(strategy="prior"))]),
        "logistic_regression": Pipeline([("imputer", imputer()), ("scaler", StandardScaler()),
                                         ("classifier", LogisticRegression(max_iter=3000, C=0.3, random_state=SEED))]),
        "random_forest": Pipeline([("imputer", imputer()), ("classifier", RandomForestClassifier(
            n_estimators=400, min_samples_leaf=20, random_state=SEED, n_jobs=-1))]),
    }


def fit(model: Pipeline, train: pd.DataFrame) -> Pipeline:
    shown = pd.concat([train, mirror(train)], ignore_index=True)  # every fight from both fighters' side
    return model.fit(shown[FEATURE_COLUMNS], shown["y"])


def symmetric_probability(model: Pipeline, frame: pd.DataFrame) -> np.ndarray:
    """P(A wins), averaged over the two orders so that p(A, B) + p(B, A) = 1 exactly."""
    forward = model.predict_proba(frame[FEATURE_COLUMNS])[:, 1]
    backward = model.predict_proba(mirror(frame.assign(y=0))[FEATURE_COLUMNS])[:, 1]
    return (forward + 1.0 - backward) / 2.0


def average_probability(models: list[Pipeline], frame: pd.DataFrame) -> np.ndarray:
    """The mean of what each model says: boosting and a linear model are wrong about different fights."""
    return np.mean([symmetric_probability(model, frame) for model in models], axis=0)


def blocks(data: pd.DataFrame, start: pd.Timestamp, end: pd.Timestamp, months: int) -> list[tuple[pd.DataFrame, pd.DataFrame]]:
    """(everything before, the fights of the block) for consecutive blocks from start to end (not included)."""
    edges = [pd.Timestamp(start)]
    while edges[-1] < end:
        edges.append(min(edges[-1] + pd.DateOffset(months=months), pd.Timestamp(end)))
    cut = [(data[data["date"] < a], data[(data["date"] >= a) & (data["date"] < b)]) for a, b in zip(edges[:-1], edges[1:])]
    return [(before, block) for before, block in cut if len(block) and len(before)]


def fit_temperature(p: np.ndarray, y: np.ndarray) -> float:
    result = minimize_scalar(lambda t: log_loss(y, np.clip(calibrate(p, t), 1e-6, 1 - 1e-6)), bounds=(0.2, 5.0), method="bounded")
    return float(result.x)


# --------------------------------------------------------------------------- metrics


def expected_calibration_error(p: np.ndarray, y: np.ndarray, bins: int = 10) -> float:
    edges = np.linspace(0, 1, bins + 1)
    index = np.clip(np.digitize(p, edges[1:-1]), 0, bins - 1)
    return float(sum(abs(y[index == b].mean() - p[index == b].mean()) * (index == b).mean() for b in range(bins) if (index == b).any()))


def metrics(p: np.ndarray, y: np.ndarray) -> dict[str, float]:
    return {
        "accuracy": float(accuracy_score(y, p >= 0.5)),
        "roc_auc": float(roc_auc_score(y, p)),
        "log_loss": float(log_loss(y, np.clip(p, 1e-6, 1 - 1e-6))),
        "brier": float(brier_score_loss(y, p)),
        "ece": expected_calibration_error(p, y),
    }


def confidence_table(p: np.ndarray, y: np.ndarray) -> pd.DataFrame:
    confidence = np.maximum(p, 1 - p)
    right = (p >= 0.5) == (y == 1)
    rows = []
    for low, high in CONFIDENCE_BANDS:
        inside = (confidence >= low) & (confidence < high)
        if inside.any():
            rows.append({"band": f"{low:.0%}-{min(high, 1):.0%}", "fights": int(inside.sum()),
                         "average_confidence": float(confidence[inside].mean()), "hit_rate": float(right[inside].mean())})
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- the run

BOOSTING, LINEAR, COMBINED = "gradient_boosting", "logistic_regression", "combined"
# The kinds of model compared on the earlier fights, by the members they average.
KINDS: dict[str, tuple[str, ...]] = {BOOSTING: (BOOSTING,), LINEAR: (LINEAR,), COMBINED: (BOOSTING, LINEAR)}


def new_member(name: str, settings: tuple) -> Pipeline:
    return hgb_pipeline(*settings) if name == BOOSTING else baselines()["logistic_regression"]


@dataclass
class Result:
    split: Split
    kind: str
    models: list[Pipeline]  # the members of the saved model, trained on every fight
    settings: tuple
    temperature: float
    test_metrics: dict[str, dict[str, float]]
    selection: list[dict]
    selection_fights: int
    selection_start: pd.Timestamp
    kinds: dict[str, float]  # log loss of each kind on the earlier fights
    bands: pd.DataFrame
    segments: list[dict]
    importance: list[dict]
    probabilities: np.ndarray
    against_frozen: tuple[float, float, float]


def segment_table(test: pd.DataFrame, p: np.ndarray) -> list[dict]:
    """How the model does on kinds of fights, so that a good average cannot hide a weak spot."""
    y = test["y"].to_numpy()
    no_history = test["sig_acc_diff"].isna().to_numpy()
    women, title = test["womens"].to_numpy() == 1, test["title_fight"].to_numpy() == 1
    rows = []
    for label, inside in (
        ("Both with fight statistics", ~no_history),
        ("At least one without fight statistics", no_history),
        ("Men", ~women),
        ("Women", women),
        ("Title fights", title),
    ):
        if not inside.any():
            continue
        own = metrics(p[inside], y[inside]) if len(set(y[inside])) == 2 else None
        rows.append({
            "label": label, "fights": int(inside.sum()),
            "accuracy": float(((p[inside] >= 0.5) == (y[inside] == 1)).mean()),
            "average_confidence": float(np.maximum(p[inside], 1 - p[inside]).mean()),
            "log_loss": own["log_loss"] if own else None,
        })
    return rows


def importance_table(walk: list[tuple[list[Pipeline], pd.DataFrame]], temperature: float) -> list[dict]:
    """How much worse the test predictions get when one factor is shuffled among the fights of its block (so it no longer says
    anything about the fight it sits in): the extra log loss. Near 0: the model hardly needs it. The columns of RESULT_COLUMNS
    are shuffled together, because each one can be rebuilt from the others."""
    y = np.concatenate([block["y"].to_numpy() for _, block in walk])

    def loss(shuffled: list[str]) -> float:
        rng = np.random.default_rng(SEED)
        parts = []
        for models, block in walk:
            changed = block.copy()
            if shuffled:
                order = rng.permutation(len(block))
                changed[shuffled] = block[shuffled].to_numpy()[order]
            parts.append(average_probability(models, changed))
        return float(log_loss(y, np.clip(calibrate(np.concatenate(parts), temperature), 1e-6, 1 - 1e-6)))

    base = loss([])
    groups = {RESULTS_FACTOR: RESULT_COLUMNS} | {c: [c] for c in FEATURE_COLUMNS if c not in RESULT_COLUMNS}
    rows = [{"factor": name, "extra_log_loss": loss(columns) - base} for name, columns in groups.items()]
    return sorted(rows, key=lambda row: -row["extra_log_loss"])


def log_loss_difference(p: np.ndarray, reference: np.ndarray, y: np.ndarray, draws: int = 2000) -> tuple[float, float, float]:
    """Mean log loss of p minus that of the reference on the same fights, with a 95% bootstrap interval. Below 0: p is better."""
    per_fight = lambda q: -(y * np.log(np.clip(q, 1e-6, 1 - 1e-6)) + (1 - y) * np.log(np.clip(1 - q, 1e-6, 1 - 1e-6)))  # noqa: E731
    d = per_fight(p) - per_fight(reference)
    rng = np.random.default_rng(SEED)
    means = [d[rng.integers(0, len(d), len(d))].mean() for _ in range(draws)]
    low, high = np.percentile(means, [2.5, 97.5])
    return float(d.mean()), float(low), float(high)


def run(data: pd.DataFrame) -> Result:
    split = split_by_date(data)
    test_start, after = split.calibration_end, data["date"].max() + pd.Timedelta(days=1)
    earlier = data[data["date"] < test_start]

    # 1) the earlier fights: each year predicted by models that saw only the years before it
    folds = blocks(earlier, pd.Timestamp(SELECTION_START), test_start, SELECTION_STEP_MONTHS)
    y_sel = np.concatenate([block["y"].to_numpy() for _, block in folds])

    def out_of_fold(make) -> np.ndarray:
        return np.concatenate([symmetric_probability(fit(make(), before), block) for before, block in folds])

    def loss(p: np.ndarray) -> float:
        return float(log_loss(y_sel, np.clip(p, 1e-6, 1 - 1e-6)))

    boosted = {settings: out_of_fold(lambda settings=settings: hgb_pipeline(*settings)) for settings in HGB_SETTINGS}
    selection = [{"settings": settings, "log_loss": loss(p)} for settings, p in boosted.items()]
    best = min(selection, key=lambda row: row["log_loss"])["settings"]
    members = {BOOSTING: boosted[best], LINEAR: out_of_fold(baselines_linear)}
    by_kind = {kind: np.mean([members[name] for name in names], axis=0) for kind, names in KINDS.items()}
    kinds = {kind: loss(p) for kind, p in by_kind.items()}
    kind = min(kinds, key=kinds.__getitem__)
    temperature = fit_temperature(by_kind[kind], y_sel)

    # 2) the test block, six months at a time, each by models trained on everything before it
    walked: dict[str, list[np.ndarray]] = {BOOSTING: [], LINEAR: [], "dummy_prior": [], "random_forest": []}
    test_blocks = blocks(data, test_start, after, TEST_STEP_MONTHS)
    walk: list[tuple[list[Pipeline], pd.DataFrame]] = []
    for before, block in test_blocks:
        fitted = {BOOSTING: fit(hgb_pipeline(*best), before)} | {name: fit(model, before) for name, model in baselines().items()}
        for name, model in fitted.items():
            walked[name].append(symmetric_probability(model, block))
        walk.append(([fitted[name] for name in KINDS[kind]], block))
    test = pd.concat([block for _, block in test_blocks])
    y_test = test["y"].to_numpy()
    p_test = {name: np.concatenate(parts) for name, parts in walked.items()}
    p_test[COMBINED] = (p_test[BOOSTING] + p_test[LINEAR]) / 2
    chosen = calibrate(p_test[kind], temperature)

    # what the site served before: boosting alone, trained once on the oldest 65%, calibrated on the block after it
    old = fit(hgb_pipeline(*best), split.train)
    old_temperature = fit_temperature(symmetric_probability(old, split.calibration), split.calibration["y"].to_numpy())
    frozen = calibrate(symmetric_probability(old, test), old_temperature)

    results = {"chosen": metrics(chosen, y_test), "chosen_raw": metrics(p_test[kind], y_test), "frozen_boosting": metrics(frozen, y_test)}
    results |= {name: metrics(p, y_test) for name, p in p_test.items()}
    for name, column, sign in RULES:
        difference = sign * test[column].to_numpy()
        # The rule has no opinion on a tie or a missing number: half of those count as right.
        right = np.where(np.nan_to_num(difference) == 0, 0.5, (difference > 0) == (y_test == 1))
        results[name] = {"accuracy": float(right.mean())}

    # 3) the model to use: the same procedure with every fight there is
    final = [fit(new_member(name, best), data) for name in KINDS[kind]]
    return Result(
        Split(split.train, split.calibration, test, split.train_end, split.calibration_end), kind, final, best, temperature, results, selection,
        len(y_sel), folds[0][1]["date"].min(), kinds, confidence_table(chosen, y_test), segment_table(test, chosen),
        importance_table(walk, temperature), chosen,
        log_loss_difference(chosen, frozen, y_test),
    )


def baselines_linear() -> Pipeline:
    return baselines()["logistic_regression"]


# One-number rules anyone could apply: (name, column, +1 when more is better for fighter A).
RULES = [("higher_elo", "elo_diff", 1), ("more_wins", "ufc_wins_diff", 1), ("younger", "age_diff", -1)]

BASELINE_LABELS = {
    "dummy_prior": "Always 50/50",
    "more_wins": "Pick the one with more UFC wins",
    "higher_elo": "Pick the higher rating (Elo)",
    "younger": "Pick the younger one",
    LINEAR: "Logistic regression",
    "random_forest": "Random forest",
    BOOSTING: "Gradient boosting",
}


def evaluation_summary(result: Result) -> dict:
    """The honest test, in the shape the API sends to the site as `recent_evaluation`."""
    test = result.split.test
    summary = dict(result.test_metrics["chosen"])
    baseline_rows = []
    for name, label in BASELINE_LABELS.items():
        if name == result.kind:
            continue
        own = result.test_metrics[name]
        # The accuracy of "always 50/50" is which side the coin lands on, not a skill.
        baseline_rows.append({"label": label, "accuracy": 0.5 if name == "dummy_prior" else own["accuracy"], "log_loss": own.get("log_loss")})
    summary.update(
        fights=int(len(test)), start=str(test["date"].min().date()), end=str(test["date"].max().date()),
        baselines=baseline_rows,
        calibration=[{"label": row.band, "fights": int(row.fights), "average_confidence": float(row.average_confidence),
                      "accuracy": float(row.hit_rate)} for row in result.bands.itertuples()],
        segments=result.segments,
        importance=result.importance,
    )
    return summary


def save_candidate(result: Result, data: pd.DataFrame, path: Path = CANDIDATE_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "members": result.models,
        "kind": result.kind,
        "feature_columns": FEATURE_COLUMNS,
        "metrics": result.test_metrics["chosen"],
        "baseline_metrics": {k: result.test_metrics[k] for k in ("dummy_prior", LINEAR, "random_forest", BOOSTING) if k != result.kind},
        "shap_background": data[FEATURE_COLUMNS].sample(min(80, len(data)), random_state=SEED),
        "calibration": {"method": "temperature", "temperature": result.temperature},
        "evaluation": evaluation_summary(result),
        "settings": result.settings,
        "trained_through": str(data["date"].max().date()),
        "model_key": MODEL_KEY,
        "version": "prefight-2",
    }, path)


def save_backtest(result: Result, path: Path = PREFIGHT_BACKTEST_PATH) -> None:
    """Each test fight with the chance a version trained only on earlier fights gave fighter A: the model's record by fighter."""
    test = result.split.test
    pd.DataFrame({
        "date": test["date"].dt.date.astype(str), "fighter_a": test["fighter_a"], "fighter_b": test["fighter_b"],
        "prob_a": result.probabilities.round(4), "a_won": test["y"].astype(int),
    }).to_csv(path, index=False, lineterminator="\n")


KIND_NAMES = {BOOSTING: "Gradient boosting", LINEAR: "Logistic regression", COMBINED: "Average of both"}


def render_report(result: Result, data: pd.DataFrame, fights_total: int) -> str:
    s = result.split
    stats_share = float(data[["sig_acc_diff"]].notna().mean().iloc[0])
    test_stats_share = float(s.test["sig_acc_diff"].notna().mean())
    m = result.test_metrics
    table = [
        ("Pick the one with more UFC wins", "more_wins"), ("Pick the younger one", "younger"), ("Pick the higher rating (Elo)", "higher_elo"),
        ("Always 50/50", "dummy_prior"), ("Random forest", "random_forest"), ("Logistic regression", LINEAR), ("Gradient boosting", BOOSTING),
        ("Average of both", COMBINED), ("Served before (boosting trained once, on fights before " + str(s.train_end.date()) + ")", "frozen_boosting"),
        (f"**{KIND_NAMES[result.kind]}, calibrated (candidate)**", "chosen"),
    ]
    mean, low, high = result.against_frozen
    lines = [
        "# Prefight model: training report", "",
        "Generated by `python -m src.ufc_predictor.train_prefight`. Every fight is described by what was known before it.", "",
        "## Data", "",
        f"- {fights_total:,} past fights in `event_cards.csv`; {len(data):,} have a winner and both fighters identified, and are used.",
        f"- {stats_share:.0%} of those fights have striking and takedown history for both fighters from earlier fights ({test_stats_share:.0%} of the test fights).",
        f"- Fighter A and B are drawn at random per fight (share of fights where A won: {data['y'].mean():.1%}).",
        "- No year or month feature, no corner, no career total from today.", "",
        "## How it was decided and tested", "",
        "| Block | Fights | From | To |", "| --- | --- | --- | --- |",
        f"| Decisions (settings, kind of model, calibration), each year predicted from the years before it | {result.selection_fights:,} | {result.selection_start.date()} | {s.calibration['date'].max().date()} |",
        f"| Test, six months at a time, each predicted from everything before it | {len(s.test):,} | {s.test['date'].min().date()} | {s.test['date'].max().date()} |", "",
        f"The saved model was then trained on all {len(data):,} fights, up to {data['date'].max().date()}: the procedure that was tested, one step further.", "",
        "The test block was also looked at for earlier versions of this model and while planning this one, so it is not untouched. What was decided "
        "(the average, the settings, the calibration) was decided on the earlier block; the live record on the site is the stricter test.", "",
        "## Kinds of model, on the decision block", "", "| Model | Log loss |", "| --- | --- |",
        *(f"| {KIND_NAMES[kind]}{' (chosen)' if kind == result.kind else ''} | {value:.4f} |" for kind, value in result.kinds.items()), "",
        "## Results on the test block", "",
        "| Model | Accuracy | ROC AUC | Log loss | Brier | Calibration error |", "| --- | --- | --- | --- | --- | --- |",
    ]
    for name, key in table:
        own = m[key]
        numbers = [f"{own[k]:.3f}" if k in own else "" for k in ("roc_auc", "log_loss", "brier", "ece")]
        lines.append(f"| {name} | {own['accuracy']:.1%} | " + " | ".join(numbers) + " |")
    lines += [
        "", f"Log loss of the candidate minus that of the model served before, on the same fights: {mean:+.4f} (95% interval {low:+.4f} to {high:+.4f}; below 0 is better). "
        f"The accuracy of {len(s.test):,} fights carries an error of about {1.96 * (0.25 / len(s.test)) ** 0.5 * 100:.1f} points either way, so the models within that distance cannot be told apart by accuracy.", "",
        "Probabilities are averaged over both fighter orders, so the answer does not depend on who is called A. "
        f"Calibration is one number (temperature {result.temperature:.2f}) fitted on the decision block.", "",
        "## Calibration of the candidate on the test block", "",
        "| Confidence | Fights | Average confidence | Right |", "| --- | --- | --- | --- |",
    ]
    for row in result.bands.itertuples():
        lines.append(f"| {row.band} | {row.fights} | {row.average_confidence:.1%} | {row.hit_rate:.1%} |")
    lines += ["", "## Kinds of fights in the test block", "", "| Fights | Number | Average confidence | Right |", "| --- | --- | --- | --- |"]
    for row in result.segments:
        lines.append(f"| {row['label']} | {row['fights']} | {row['average_confidence']:.1%} | {row['accuracy']:.1%} |")
    lines += [
        "", "## What the model needs most", "", "Extra log loss on the test block when a factor is shuffled among the fights. "
        f"`{RESULTS_FACTOR}` is {', '.join(f'`{c}`' for c in RESULT_COLUMNS)} together.", "", "| Factor | Extra log loss |", "| --- | --- |",
        *(f"| `{row['factor']}` | {row['extra_log_loss']:+.4f} |" for row in result.importance),
    ]
    lines += [
        "", "## Gradient boosting settings tried on the decision block", "", "| max depth | learning rate | iterations | L2 | Log loss |", "| --- | --- | --- | --- | --- |",
    ]
    for row in result.selection:
        d, lr, it, l2 = row["settings"]
        chosen = " (chosen)" if row["settings"] == result.settings else ""
        lines.append(f"| {d} | {lr} | {it} | {l2} | {row['log_loss']:.4f}{chosen} |")
    lines += ["", "## Features", "", f"{len(FEATURE_COLUMNS)} features: " + ", ".join(f"`{c}`" for c in FEATURE_COLUMNS) + ".", ""]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--no-write", action="store_true", help="train and print the report, write no files")
    parser.add_argument(
        "--promote", action="store_true",
        help=f"also write the model to {PREFIGHT_MODEL_PATH.name}, the file the API serves by default",
    )
    args = parser.parse_args(argv)

    data, fights, _ = build_from_repository()
    result = run(data)
    report = render_report(result, data, len(fights))
    print(report)
    if args.no_write:
        return
    save_candidate(result, data)
    written = {"candidate": str(CANDIDATE_PATH), "report": str(REPORT_PATH)}
    if args.promote:
        save_candidate(result, data, PREFIGHT_MODEL_PATH)
        save_backtest(result)
        written["promoted"], written["backtest"] = str(PREFIGHT_MODEL_PATH), str(PREFIGHT_BACKTEST_PATH)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(report + "\n", encoding="utf-8")
    print(json.dumps(written))


if __name__ == "__main__":
    main()
