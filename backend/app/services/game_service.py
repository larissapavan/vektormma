"""The career game: who a made-up fighter is offered to fight, and the model's chance against each.

The character is described by three skills (percentiles among real UFC fighters), an age, a stance and a record. They are
turned into the numbers the model reads: striking and takedown accuracy, reach and height. The model then scores the
character against real, active UFC fighters, exactly as it does for two catalog fighters (PredictionService.predict_profiles).

Game rules sit on top of the model and are stated on the page:

- the model reads numbers, not rank, and a record like 6-0 earns it far more trust than it deserves against a division's
  veterans, so the chance is lowered by RANKED_PENALTY (4 points) against a ranked fighter and CHAMPION_PENALTY (6 points)
  against the champion (the ranks come from the official rankings);
- the pre-fight model gives the two accuracies and the reach only a few points between the worst and the best (it reads a
  fighter's whole history, and the character has none), so building and training the character would hardly matter. The
  skill edge adds SKILL_WEIGHT times the average gap between the character's three skills and the opponent's, on the same
  percentile scale, up to SKILL_EDGE_MAX either way.
"""

from __future__ import annotations

import random

import numpy as np

from .catalog_service import _normalize_name, get_fighter_catalog, get_fighter_profile
from .rankings_service import get_rankings

PLAYER_NAME = "Vektor Career Player"
# How the offered fights are told apart: the chance of winning each aims at (a fight the player should win, a coin flip, a risk).
TARGETS = {"safe": 0.66, "even": 0.50, "risk": 0.34}
RANKED_PENALTY = 0.04
CHAMPION_PENALTY = 0.06
# 0.25 per 100 percentile points: a character 30 points better on average is 7.5 points likelier to win, capped at 10.
SKILL_WEIGHT = 0.25
SKILL_EDGE_MAX = 0.10
MIN_CHANCE, MAX_CHANCE = 0.03, 0.97
POOL_SAMPLE = 40  # opponents scored per request: enough variety to reach both ends, and the model is asked for each one
MIN_OPPONENT_FIGHTS = 3

_cache: dict = {"catalog": None, "skills": None, "frames": None, "profiles": {}}


def _distributions() -> tuple[dict[str, np.ndarray], dict[str, dict[str, np.ndarray]]]:
    catalog = get_fighter_catalog()
    if _cache["catalog"] is not catalog:
        seasoned = catalog[(catalog["ufc_status"] == "active") & (catalog["total_fights"].fillna(0) >= 5)]
        skills = {
            "sig_str_acc": np.sort(seasoned["sig_str_acc"].dropna().to_numpy(dtype=float)),
            "takedown_acc": np.sort(seasoned["takedown_acc"].dropna().to_numpy(dtype=float)),
        }
        in_ufc = catalog[catalog["ufc_status"].isin(["active", "former"])]
        frames: dict[str, dict[str, np.ndarray]] = {}
        for division, group in in_ufc.groupby("division"):
            frames[str(division)] = {
                "reach_cm": np.sort(group["reach_cm"].dropna().to_numpy(dtype=float)),
                "height_cm": np.sort(group["height_cm"].dropna().to_numpy(dtype=float)),
            }
        _cache.update(catalog=catalog, skills=skills, frames=frames, profiles={})
    return _cache["skills"], _cache["frames"]


def _at(values: np.ndarray, percentile: float, fallback: float) -> float:
    return float(np.quantile(values, min(max(percentile, 0.0), 100.0) / 100.0)) if len(values) else fallback


def player_stats(striking: float, takedowns: float, reach: float, division: str) -> dict:
    """The model's inputs for a character with these skills, in this division."""
    skills, frames = _distributions()
    frame = frames.get(division, {})
    return {
        "sig_str_acc": round(_at(skills["sig_str_acc"], striking, 0.45), 3),
        "takedown_acc": round(_at(skills["takedown_acc"], takedowns, 0.38), 3),
        "reach_cm": round(_at(frame.get("reach_cm", np.array([])), reach, 183.0), 1),
        "height_cm": round(_at(frame.get("height_cm", np.array([])), reach, 178.0), 1),
    }


def _player_profile(fighter: dict, division: str, stats: dict) -> dict:
    total = fighter["wins"] + fighter["losses"] + fighter["draws"]
    return {
        "name": PLAYER_NAME,
        "age": fighter["age"],
        "height_cm": stats["height_cm"],
        "reach_cm": stats["reach_cm"],
        "wins": fighter["wins"],
        "losses": fighter["losses"],
        "draws": fighter["draws"],
        "total_fights": total,
        "win_rate": fighter["wins"] / total if total else 0.0,
        "sig_str_acc": stats["sig_str_acc"],
        "takedown_acc": stats["takedown_acc"],
        "stance": fighter["stance"],
        "division": division,
        "data_origin": None,
        "synthetic": True,  # no fights to replay: the pre-fight model builds this character's history from the profile
    }


def _profile(name: str) -> dict | None:
    _distributions()  # drops the profiles cached for an older catalog
    profiles = _cache["profiles"]
    if name not in profiles:
        try:
            profiles[name] = get_fighter_profile(name)
        except KeyError:
            profiles[name] = None
    return profiles[name]


def _ranks() -> dict[str, int]:
    """Each ranked fighter's place in their division (1 to 15), from the official rankings; the champion is told by the belt."""
    return {
        _normalize_name(entry["fighter"]): entry["rank"]
        for category in get_rankings()
        if not category["is_p4p"]
        for entry in category["entries"]
        if entry["rank"] >= 1
    }


def _percentile(values: np.ndarray, value) -> float:
    """Where a value stands among sorted values, 0 to 100; the middle when either is unknown."""
    if value is None or not len(values):
        return 50.0
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 50.0
    if number != number:  # NaN
        return 50.0
    # The middle of the tie: many fighters share a takedown accuracy of 0, and the last of them is not above all the others.
    below, through = np.searchsorted(values, number, side="left"), np.searchsorted(values, number, side="right")
    return 100.0 * float(below + through) / 2 / len(values)


def opponent_skills(profile: dict, division: str) -> dict[str, float]:
    """The opponent's three skills on the character's scale: percentiles among the same fighters the character is measured on."""
    skills, frames = _distributions()
    return {
        "striking": _percentile(skills["sig_str_acc"], profile.get("sig_str_acc")),
        "takedowns": _percentile(skills["takedown_acc"], profile.get("takedown_acc")),
        "reach": _percentile(frames.get(division, {}).get("reach_cm", np.array([])), profile.get("reach_cm")),
    }


def skill_edge(fighter: dict, opponent: dict[str, float]) -> float:
    gap = sum(float(fighter[key]) - opponent[key] for key in ("striking", "takedowns", "reach")) / 3
    return min(max(SKILL_WEIGHT * gap / 100, -SKILL_EDGE_MAX), SKILL_EDGE_MAX)


def _adjusted(chance: float, opponent: dict, rank: int | None = None, edge: float = 0.0) -> float:
    if opponent.get("belt"):
        chance -= CHAMPION_PENALTY
    elif rank:
        chance -= RANKED_PENALTY
    return min(max(chance + edge, MIN_CHANCE), MAX_CHANCE)


def _opponent(label: str, profile: dict, chance: float, rank: int | None = None) -> dict:
    wins, losses, draws = profile.get("wins") or 0, profile.get("losses") or 0, profile.get("draws") or 0
    return {
        "label": label,
        "name": profile["name"],
        "image_url": profile.get("image_url"),
        "country_code": profile.get("country_code"),
        "record": f"{int(wins)}-{int(losses)}-{int(draws)}",
        "age": profile.get("age"),
        "reach_cm": profile.get("reach_cm"),
        "stance": profile.get("stance"),
        "ranking": str(rank) if rank else None,
        "champion": bool(profile.get("belt")),
        "sig_str_acc": profile.get("sig_str_acc"),
        "takedown_acc": profile.get("takedown_acc"),
        "win_probability": round(chance, 4),
    }


def _candidates(division: str, title: bool, exclude: set[str]) -> list[str]:
    catalog = get_fighter_catalog()
    pool = catalog[(catalog["ufc_status"] == "active") & (catalog["division"] == division)]
    pool = pool[pool["belt"].fillna(False).astype(bool) == title]
    if not title:
        pool = pool[pool["total_fights"].fillna(0) >= MIN_OPPONENT_FIGHTS]
    return [name for name in pool["name"] if name not in exclude]


def matchmake(service, request: dict) -> dict:
    """The fights on offer for a character, each with the chance of winning it (see the module note for the two game rules)."""
    fighter, division = request["fighter"], request["division"]
    stats = player_stats(fighter["striking"], fighter["takedowns"], fighter["reach"], division)
    me = _player_profile(fighter, division, stats)
    rng = random.Random(request["seed"])
    ranks = _ranks()
    rank_of = lambda profile: ranks.get(_normalize_name(profile["name"]))  # noqa: E731

    def score(profile: dict, title: bool) -> float:
        # A champion's fights are five rounds, a title on the line or not.
        context = {"weight_class": division, "title_fight": title, "num_rounds": 5 if title or request["champion"] else 3}
        edge = skill_edge(fighter, opponent_skills(profile, division))
        return _adjusted(service.predict_profiles(me, profile, context), profile, rank_of(profile), edge)

    def offer(label: str, profile: dict, title: bool) -> dict:
        return _opponent(label, profile, score(profile, title), rank_of(profile))

    if request["names"]:
        named = [(name, _profile(name)) for name in request["names"]]
        offers = [offer("rematch", profile, bool(profile.get("belt"))) for _, profile in named if profile]
        return {"player": stats, "opponents": offers}

    exclude = set(request["exclude"])
    names = _candidates(division, request["title"], exclude)
    if request["title"]:
        champion = _profile(names[0]) if names else None
        offers = [offer("champion", champion, True)] if champion else []
        return {"player": stats, "opponents": offers}

    rng.shuffle(names)
    scored = [(profile, score(profile, False)) for profile in (_profile(name) for name in names[:POOL_SAMPLE]) if profile]
    ranked_by_name = {profile["name"]: rank_of(profile) for profile, _ in scored}
    picked: list[tuple[float, dict]] = []
    taken: set[str] = set()
    for target in TARGETS.values():
        ranked = sorted((item for item in scored if item[0]["name"] not in taken), key=lambda item: abs(item[1] - target))
        if not ranked:
            break
        profile, chance = ranked[0]
        taken.add(profile["name"])
        picked.append((chance, profile))
    # Easiest first; the label is the slot (safe, even, risk), the page words each fight by its own chance.
    picked.sort(key=lambda item: -item[0])
    return {"player": stats, "opponents": [_opponent(label, profile, chance, ranked_by_name[profile["name"]]) for label, (chance, profile) in zip(TARGETS, picked)]}
