"""The data behind the static text of the list pages (frontend/src/seo/pages.json).

    python -m scripts.build_seo_athletes     (writes this file too)

The site is a single-page app, and a crawler that reads the HTML as served finds only what the build wrote into it. This
file gives the build the substance of each list page: the UFC rankings, champions, announced cards, latest results, the
model's settled picks, the cancelled fights and the biggest gyms, and for every other organization its cards, results,
champions, rankings and a roster. It holds names, dates and numbers only; the sentences are written in each language by
frontend/src/seo/pages.ts. Only the build reads it, so the app never downloads it.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from backend.app.services.cancelled_fights_service import get_cancelled_fights
from backend.app.services.champions_service import get_champions_data
from backend.app.services.data_info_service import get_data_info
from backend.app.services.events_service import get_events, get_upcoming_events
from backend.app.services.gyms_service import list_gyms
from backend.app.services.org_service import get_org_events, get_org_fighters, get_org_rankings, get_org_upcoming_events, list_orgs
from backend.app.services.rankings_service import get_rankings
from backend.app.services.record_book_service import get_record_book
from backend.app.services.track_record_service import get_track_record, load_log

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "frontend" / "src" / "seo" / "pages.json"

UPCOMING_EVENTS = 6
RESULT_EVENTS = 5
ORG_UPCOMING_EVENTS = 3
ORG_RESULT_EVENTS = 4
ROSTER_SIZE = 120
GYMS = 40
ORG_GYMS = 25
RECORD_LEADERS = 3

_PLACEHOLDERS = {"TBD", "TBA", ""}


def _int(value) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _fight(fight: dict) -> dict | None:
    a, b = fight.get("fighter_1"), fight.get("fighter_2")
    if not a or not b or str(a).strip().upper() in _PLACEHOLDERS or str(b).strip().upper() in _PLACEHOLDERS:
        return None
    return {
        "a": a,
        "b": b,
        "winner": fight.get("winner") or None,
        "method": fight.get("method") or None,
        "round": _int(fight.get("round")),
        "time": fight.get("time") or None,
        "weightClass": fight.get("weight_class") or None,
        "title": bool(fight.get("title_fight")),
    }


def _event(event: dict) -> dict | None:
    fights = [entry for entry in (_fight(fight) for fight in event.get("fights", [])) if entry]
    if not event.get("date") or not fights:
        return None
    return {"name": event["name"], "date": str(event["date"])[:10], "location": event.get("location") or None, "fights": fights}


def _events(events: list[dict], limit: int) -> list[dict]:
    return [entry for entry in (_event(event) for event in events) if entry][:limit]


def _rankings(rankings: list[dict]) -> list[dict]:
    return [
        {"category": group["category"], "p4p": bool(group.get("is_p4p")), "fighters": [entry["fighter"] for entry in sorted(group["entries"], key=lambda e: e["rank"])]}
        for group in rankings
        if group.get("entries")
    ]


def _picks() -> dict[tuple[str, str, str], dict]:
    """The model's saved pick of each UFC fight, by day and the two names in alphabetical order."""
    picks: dict[tuple[str, str, str], dict] = {}
    for row in load_log().to_dict(orient="records"):
        try:
            probability = round(float(row["confidence"]), 4)
        except (TypeError, ValueError):
            continue
        key = (str(row["event_date"])[:10], *sorted([str(row["fighter_1"]), str(row["fighter_2"])]))
        picks[key] = {"winner": str(row["predicted_winner"]), "probability": probability}
    return picks


def _with_picks(events: list[dict], picks: dict) -> list[dict]:
    """The events with the saved pick on each fight that has one (UFC cards only)."""
    for event in events:
        for fight in event["fights"]:
            pick = picks.get((event["date"], *sorted([fight["a"], fight["b"]])))
            if pick:
                fight["pick"] = pick
    return events


def _ufc(today: str) -> dict:
    champions = [
        {"division": reign["division"], "champion": reign["champion"], "interim": reign.get("title_type") == "interim", "since": str(reign["date_won"])[:10], "defenses": _int(reign.get("defenses_count")) or 0}
        for reign in get_champions_data()["current_champions"]
    ]
    record = get_track_record()
    saved = _picks()
    picks = [
        {"event": pick["event_name"], "date": str(pick["event_date"])[:10], "a": pick["fighter_1"], "b": pick["fighter_2"], "pick": pick["predicted_winner"], "confidence": round(float(pick["confidence"]), 4), "correct": bool(pick["correct"])}
        for pick in record.get("recent", [])
    ]
    cancelled = [
        {"a": fight["fighter_1"]["name"], "b": fight["fighter_2"]["name"], "event": fight.get("event_name"), "date": str(fight["event_date"])[:10] if fight.get("event_date") else None, "weightClass": fight.get("weight_class"), "title": bool(fight.get("title_fight"))}
        for fight in get_cancelled_fights()
    ]
    return {
        "upcoming": _with_picks(_events([event for event in get_upcoming_events() if str(event.get("date") or "") >= today], UPCOMING_EVENTS), saved),
        "results": _with_picks(_events([event for event in get_events() if str(event.get("date") or "") < today], RESULT_EVENTS), saved),
        "rankings": _rankings(get_rankings()),
        "champions": champions,
        "trackRecord": {"since": record.get("tracking_since"), "resolved": record.get("resolved"), "correct": record.get("correct"), "accuracy": record.get("accuracy"), "picks": picks},
        "cancelled": cancelled,
        "recordBook": _record_book(),
    }


def _record_book() -> list[dict]:
    """Each stat of the record book with its first leaders (the titles stay in English; the frontend has the other languages)."""
    return [
        {
            "name": category["name"],
            "stats": [
                {"key": stat["key"], "title": stat["title"], "leaders": [{"fighter": leader["fighter"], "value": str(leader["value"])} for leader in stat["leaders"][:RECORD_LEADERS]]}
                for stat in category["stats"]
                if stat.get("leaders")
            ],
        }
        for category in get_record_book()["categories"]
    ]


def _record(fighter: dict) -> str | None:
    wins, losses = _int(fighter.get("wins")), _int(fighter.get("losses"))
    if wins is None or losses is None:
        return None
    return f"{wins}-{losses}-{_int(fighter.get('draws')) or 0}"


def _org(org_id: str, today: str) -> dict:
    fighters = get_org_fighters(org_id)
    champions = [
        {"division": f.get("division"), "champion": f["name"], "interim": f.get("title_status") == "interim", "record": _record(f), "country": f.get("country") or None}
        for f in fighters
        if f.get("belt") and f.get("division")
    ]
    # The roster page lists the busiest active fighters (or, for an archive with nobody active, the busiest of all).
    pool = [f for f in fighters if f.get("is_active")] or fighters
    roster = sorted(pool, key=lambda f: (-(_int(f.get("total_fights")) or 0), f["name"]))[:ROSTER_SIZE]
    past = sorted((event for event in get_org_events(org_id) if str(event.get("date") or "") < today), key=lambda event: str(event["date"]), reverse=True)
    upcoming = sorted((event for event in get_org_upcoming_events(org_id) if str(event.get("date") or "") >= today), key=lambda event: str(event["date"]))
    try:
        rankings = _rankings(get_org_rankings(org_id))
    except (KeyError, FileNotFoundError, ValueError):
        rankings = []
    return {
        "fighterCount": len(fighters),
        "eventCount": len(past),
        "upcoming": _events(upcoming, ORG_UPCOMING_EVENTS),
        "results": _events(past, ORG_RESULT_EVENTS),
        "rankings": rankings,
        "champions": sorted(champions, key=lambda entry: entry["division"]),
        "roster": [{"name": f["name"], "record": _record(f), "division": f.get("division") or None} for f in roster],
    }


def _gyms() -> dict:
    gyms = list_gyms()
    entry = lambda gym, count: {"slug": gym["slug"], "name": gym["name"], "fighters": count}  # noqa: E731
    top = sorted(gyms, key=lambda gym: (-gym["fighters_count"], gym["name"]))[:GYMS]
    by_org: dict[str, list[dict]] = {}
    for org in list_orgs():
        members = [gym for gym in gyms if gym.get("orgs", {}).get(org.id)]
        by_org[org.id] = [entry(gym, gym["orgs"][org.id]) for gym in sorted(members, key=lambda gym: (-gym["orgs"][org.id], gym["name"]))[:ORG_GYMS]]
    return {"total": len(gyms), "top": [entry(gym, gym["fighters_count"]) for gym in top], "byOrg": by_org}


def _data_info() -> dict:
    info = get_data_info()
    return {"fighters": info["fighters_count"], "events": info["events_count"], "fights": info["fights_count"], "lastUpdated": info.get("last_updated")}


def _service():
    """The prediction service, or None where the model cannot be loaded (about half a minute where it can)."""
    try:
        from backend.app.services.prefight_service import build_prediction_service

        return build_prediction_service()
    except Exception as error:  # noqa: BLE001 - any failure to load the model must not stop the page data
        print(f"Model not loaded ({type(error).__name__}: {error}); keeping the model info and fight factors of the last run.")
        return None


def _model(service) -> dict:
    """What /model-info answers, without the list of feature names."""
    info = service.model_info()
    return {key: info.get(key) for key in ("model_name", "feature_count", "metrics", "baseline_metrics", "highlights", "limitations", "metrics_note", "recent_evaluation")}


def _fight_factors(service, fights: list[dict]) -> dict[str, dict]:
    """For each announced fight, the stats that pulled the model's answer most and toward whom, heaviest first."""
    factors: dict[str, dict] = {}
    for fight in fights:
        a, b = fight["a"]["name"], fight["b"]["name"]
        try:
            prediction = service.predict_matchup(a, b)
        except Exception as error:  # noqa: BLE001 - one fight the model cannot read must not drop the others
            print(f"No factors for {a} vs {b} ({type(error).__name__}: {error})")
            continue
        confidence = prediction.get("data_confidence") or {}
        factors[fight["slug"]] = {
            "factors": [{"feature": factor["feature"], "towardA": factor["impact"] == a} for factor in prediction.get("main_factors", []) if factor["impact"] in (a, b)],
            "reasons": list(confidence.get("reasons") or []),
        }
    return factors


def _previous() -> dict:
    try:
        return json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def build_pages(fights: list[dict], today: str | None = None) -> dict:
    """`fights` are the announced fights that have a page (build_fights in scripts/build_seo_athletes.py)."""
    day = today or date.today().isoformat()
    service = _service()
    previous = _previous()
    slugs = {fight["slug"] for fight in fights}
    return {
        "ufc": _ufc(day),
        "orgs": {org.id: _org(org.id, day) for org in list_orgs()},
        "gyms": _gyms(),
        "dataInfo": _data_info(),
        "model": _model(service) if service else previous.get("model"),
        "fights": _fight_factors(service, fights) if service else {slug: entry for slug, entry in (previous.get("fights") or {}).items() if slug in slugs},
    }


def write_pages(fights: list[dict]) -> Path:
    OUTPUT_PATH.write_text(json.dumps(build_pages(fights), ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return OUTPUT_PATH
