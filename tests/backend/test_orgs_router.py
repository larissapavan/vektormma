"""The generic /orgs/{id} endpoints, run against a tiny made-up organisation so the tests do not depend on scraped data."""

from __future__ import annotations

import csv
from datetime import date, timedelta
from pathlib import Path

import pytest

from backend.app.services import org_service

FIGHT_FIELDS = [
    "event_name", "event_date", "location", "event_url", "event_slug", "circuit", "fight_url", "card_order",
    "fighter_1", "fighter_2", "fighter_1_url", "fighter_2_url", "winner", "outcome",
    "weight_class", "stage", "title_fight", "method", "method_detail", "round", "time",
]
FIGHTER_FIELDS = [
    "name", "slug", "profile_url", "circuit", "nickname", "status", "career_record", "org_record",
    "wins", "losses", "draws", "no_contests", "age", "height_cm", "weight_lbs", "reach_cm", "leg_reach_cm",
    "hometown", "country", "country_code", "fighting_out_of", "camp", "weight_class", "headshot_url", "image_url",
    "first_fight_date", "last_fight_date", "checked",
]
RANKING_FIELDS = ["category", "is_p4p", "rank", "fighter", "rank_change", "status", "athlete_url"]

PAST = (date.today() - timedelta(days=60)).isoformat()
OLDER = (date.today() - timedelta(days=400)).isoformat()
NEXT = (date.today() + timedelta(days=30)).isoformat()


def _write(path: Path, fields: list[str], rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, restval="")
        writer.writeheader()
        writer.writerows(rows)


def _fight(slug, name, day, order, a, b, winner="", **extra):
    return {
        "event_name": name, "event_date": day, "location": "Test Arena", "event_url": f"https://example.test/event/{slug}",
        "event_slug": slug, "circuit": "TEST", "fight_url": f"https://example.test/event/{slug}#fight-{order}",
        "card_order": order, "fighter_1": a, "fighter_2": b, "winner": winner, "outcome": "win" if winner else "",
        "weight_class": "Lightweight", **extra,
    }


def _fighter(name, record, **extra):
    wins, losses, draws = record
    return {
        "name": name, "slug": name.lower().replace(" ", "-"), "profile_url": f"https://example.test/{name}", "status": "active",
        "wins": wins, "losses": losses, "draws": draws, "weight_class": "Lightweight", "country_code": "br", "checked": "2026-10-01",
        **extra,
    }


@pytest.fixture
def org(tmp_path, monkeypatch):
    fights = [
        # Written in card order within the event; the main event is first.
        _fight("older", "Older Card", OLDER, 0, "Ana Silva", "Bia Costa", "Ana Silva", method="SUB", method_detail="Armbar", round=2, time="3:10"),
        _fight("past", "Past Card", PAST, 0, "Ana Silva", "Caio Dias", "Caio Dias", method="U-DEC", round=3, time="5:00", title_fight="true", stage="Championship"),
        _fight("past", "Past Card", PAST, 1, "Bia Costa", "Dora Reis", "Bia Costa", method="KO/TKO", round=1, time="0:46"),
        _fight("next", "Next Card", NEXT, 0, "Caio Dias", "Dora Reis"),
    ]
    fighters = [
        _fighter("Ana Silva", (10, 2, 1), nickname="The Arm", image_url="/fighter-photos/pfl/ana-silva.webp", org_record="2-1-0", last_fight_date=PAST),
        _fighter("Bia Costa", (5, 5, 0), last_fight_date=PAST),
        _fighter("Caio Dias", (12, 0, 0), last_fight_date=PAST),
        _fighter("Dora Reis", (3, 4, 0), status="inactive"),
    ]
    rankings = [
        {"category": "Lightweight", "is_p4p": "False", "rank": 0, "fighter": "Caio Dias", "status": "champion"},
        {"category": "Lightweight", "is_p4p": "False", "rank": 1, "fighter": "Ana Silva", "rank_change": "up 1"},
        {"category": "Lightweight", "is_p4p": "False", "rank": 2, "fighter": "Bia Costa"},
        {"category": "Heavyweight", "is_p4p": "False", "rank": 0, "fighter": "", "status": "vacant"},
        {"category": "Heavyweight", "is_p4p": "False", "rank": 1, "fighter": "Somebody Unknown"},
        {"category": "Pound-for-Pound (Men's)", "is_p4p": "True", "rank": 1, "fighter": "Caio Dias"},
    ]
    _write(tmp_path / "fights.csv", FIGHT_FIELDS, fights)
    _write(tmp_path / "fighters.csv", FIGHTER_FIELDS, fighters)
    _write(tmp_path / "rankings.csv", RANKING_FIELDS, rankings)

    test_org = org_service.Org(id="test", name="Test League", short_name="TL", tagline="A made-up league.", sources=("example.test",), root=tmp_path)
    monkeypatch.setitem(org_service.ORGS, "test", test_org)
    org_service._cache.pop("test", None)
    yield test_org
    org_service._cache.pop("test", None)


def test_unknown_organisation_is_a_404(client):
    assert client.get("/orgs/nope/fighters").status_code == 404
    assert client.get("/orgs/nope/events").status_code == 404


def test_the_ufc_is_not_served_by_the_generic_endpoints(client):
    assert client.get("/orgs/ufc/fighters").status_code == 404


def test_lists_the_registered_organisations(client, org):
    listing = client.get("/orgs").json()
    assert {"id": "test", "name": "Test League", "short_name": "TL", "tagline": "A made-up league.", "sources": ["example.test"]} in listing
    assert any(item["id"] == "pfl" for item in listing)


def test_events_split_into_past_and_upcoming_and_keep_card_order(client, org):
    past = client.get("/orgs/test/events").json()
    assert [event["name"] for event in past] == ["Past Card", "Older Card"]
    card = past[0]
    assert card["fight_count"] == 2
    assert [fight["fighter_1"] for fight in card["fights"]] == ["Ana Silva", "Bia Costa"]
    assert card["fights"][0]["title_fight"] is True
    assert card["fights"][0]["stage"] == "Championship"
    assert card["fights"][1]["title_fight"] is None
    assert card["circuit"] == "TEST"

    upcoming = client.get("/orgs/test/events/upcoming").json()
    assert [event["name"] for event in upcoming] == ["Next Card"]
    assert upcoming[0]["fights"][0]["winner"] is None


def test_fighters_carry_record_titles_ranking_and_next_fight(client, org):
    response = client.get("/orgs/test/fighters")
    assert response.headers["x-total-count"] == "4"
    fighters = {fighter["name"]: fighter for fighter in response.json()}

    ana = fighters["Ana Silva"]
    assert (ana["wins"], ana["losses"], ana["draws"], ana["total_fights"]) == (10, 2, 1, 13)
    assert ana["win_rate"] == pytest.approx(10 / 13, abs=1e-4)
    assert ana["ranking"] == "#1 Lightweight"
    assert ana["belt"] is False
    assert ana["org_record"] == "2-1-0"
    assert ana["image_url"] == "/fighter-photos/pfl/ana-silva.webp"
    assert ana["org_fights"] == 2
    assert ana["next_fight"] is None

    caio = fighters["Caio Dias"]
    assert caio["belt"] is True and caio["title_status"] == "champion"
    assert caio["ranking"] == "Champion · Lightweight"
    assert caio["next_fight"]["opponent"] == "Dora Reis"
    assert caio["next_fight"]["event"] == "Next Card"

    assert fighters["Dora Reis"]["is_active"] is False


def test_active_fighters_come_first(client, org):
    names = [fighter["name"] for fighter in client.get("/orgs/test/fighters").json()]
    assert names[-1] == "Dora Reis"


def test_fighters_can_be_paged(client, org):
    page = client.get("/orgs/test/fighters", params={"limit": 2, "offset": 1}).json()
    assert len(page) == 2


def test_fighter_fights_are_newest_first_with_result_from_the_fighters_side(client, org):
    fights = client.get("/orgs/test/fighters/Ana Silva/fights").json()
    assert [fight["opponent"] for fight in fights] == ["Caio Dias", "Bia Costa"]
    assert [fight["result"] for fight in fights] == ["loss", "win"]
    assert fights[1]["method"] == "SUB" and fights[1]["method_detail"] == "Armbar" and fights[1]["round"] == 2

    upcoming = client.get("/orgs/test/fighters/Caio Dias/fights").json()
    assert upcoming[0]["opponent"] == "Dora Reis" and upcoming[0]["result"] is None


def test_fighter_fights_lookup_ignores_case_and_accents(client, org):
    assert client.get("/orgs/test/fighters/ana silva/fights").status_code == 200
    assert client.get("/orgs/test/fighters/Nobody Here/fights").status_code == 404


def test_rankings_put_p4p_first_and_know_vacant_titles(client, org):
    rankings = client.get("/orgs/test/rankings").json()
    assert [category["category"] for category in rankings] == ["Pound-for-Pound (Men's)", "Lightweight", "Heavyweight"]

    lightweight = rankings[1]["entries"]
    assert [(entry["rank"], entry["fighter"]) for entry in lightweight] == [(0, "Caio Dias"), (1, "Ana Silva"), (2, "Bia Costa")]
    assert lightweight[0]["status"] == "champion"
    assert lightweight[1]["rank_change"] == "up 1"
    assert lightweight[1]["win_rate"] == pytest.approx(10 / 13, abs=1e-4)
    assert lightweight[1]["last_fight"] == PAST

    heavyweight = rankings[2]["entries"]
    assert [entry["fighter"] for entry in heavyweight] == ["Somebody Unknown"]  # the vacant title has no row
    assert heavyweight[0]["win_rate"] is None


def test_data_info_counts(client, org):
    info = client.get("/orgs/test/data-info").json()
    assert info == {"last_updated": "2026-10-01", "fighters_count": 4, "events_count": 2, "fights_count": 3, "sources": ["example.test"]}


def test_endpoints_are_cacheable(client, org):
    for path in ("fighters", "events", "events/upcoming", "rankings", "data-info"):
        assert "max-age" in client.get(f"/orgs/test/{path}").headers["cache-control"]


def test_missing_files_give_empty_answers(client, tmp_path, monkeypatch):
    empty = org_service.Org(id="empty", name="Empty", short_name="EM", tagline="", sources=(), root=tmp_path)
    monkeypatch.setitem(org_service.ORGS, "empty", empty)
    org_service._cache.pop("empty", None)
    assert client.get("/orgs/empty/fighters").json() == []
    assert client.get("/orgs/empty/events").json() == []
    assert client.get("/orgs/empty/rankings").json() == []
    assert client.get("/orgs/empty/data-info").json()["last_updated"] is None


def test_data_is_rebuilt_when_a_file_changes(client, org):
    assert len(client.get("/orgs/test/fighters").json()) == 4
    _write(org.data_dir / "fighters.csv", FIGHTER_FIELDS, [_fighter("Only One", (1, 0, 0))])
    # The signature is the files' modification times; make sure it differs even on a coarse clock.
    import os

    stat = (org.data_dir / "fighters.csv").stat()
    os.utime(org.data_dir / "fighters.csv", ns=(stat.st_atime_ns, stat.st_mtime_ns + 10_000_000))
    assert [fighter["name"] for fighter in client.get("/orgs/test/fighters").json()] == ["Only One"]


def test_the_last_fight_ignores_a_booked_one(client, org):
    entry = next(entry for category in client.get("/orgs/test/rankings").json() for entry in category["entries"] if entry["fighter"] == "Caio Dias")
    assert entry["last_fight"] == PAST  # he also has a fight on the Next Card, a month from now


def test_an_organization_without_its_own_record_gets_one_counted_from_its_bouts(client, org):
    fighters = {fighter["name"]: fighter for fighter in client.get("/orgs/test/fighters").json()}
    assert fighters["Bia Costa"]["org_record"] == "1-1-0"  # beat Dora, lost to Ana
    assert fighters["Ana Silva"]["org_record"] == "2-1-0"  # the file's own value wins over the count
    assert fighters["Dora Reis"]["org_record"] == "0-1-0"


# --------------------------------------------------------------------------- the sport of a bout (the ONE file has a discipline column)


@pytest.fixture
def mixed_sports_org(tmp_path, monkeypatch):
    fights = [
        _fight("card", "Mixed Card", PAST, 0, "Ana Silva", "Bia Costa", "Ana Silva", method="KO/TKO", round=1, time="1:00", discipline="Muay Thai"),
        _fight("card", "Mixed Card", PAST, 1, "Ana Silva", "Caio Dias", "Caio Dias", method="U-DEC", round=3, time="5:00", discipline="MMA"),
        _fight("card", "Mixed Card", PAST, 2, "Bia Costa", "Dora Reis", "Dora Reis", method="SUB", round=2, time="2:00"),  # the source did not say
        # A card still to come, one bout of each kind.
        _fight("coming", "Coming Card", NEXT, 0, "Ana Silva", "Caio Dias", discipline="Muay Thai"),
        _fight("coming", "Coming Card", NEXT, 1, "Bia Costa", "Dora Reis", discipline="MMA"),
        _fight("coming", "Coming Card", NEXT, 2, "Ana Silva", "Dora Reis"),
        _fight("coming", "Coming Card", NEXT, 3, "Caio Dias", "Bia Costa", discipline="Kickboxing"),
    ]
    fighters = [_fighter(name, (1, 1, 0), last_fight_date=PAST) for name in ("Ana Silva", "Bia Costa", "Caio Dias", "Dora Reis")]
    _write(tmp_path / "fights.csv", [*FIGHT_FIELDS, "discipline"], fights)
    _write(tmp_path / "fighters.csv", FIGHTER_FIELDS, fighters)
    _write(tmp_path / "rankings.csv", RANKING_FIELDS, [])
    test_org = org_service.Org(id="mixed", name="Mixed Sports", short_name="MS", tagline="Several sports.", sources=("example.test",), root=tmp_path)
    monkeypatch.setitem(org_service.ORGS, "mixed", test_org)
    org_service._cache.pop("mixed", None)
    yield test_org
    org_service._cache.pop("mixed", None)


def test_the_sport_of_each_bout_is_served_with_the_card_and_blank_when_the_source_does_not_say(client, mixed_sports_org):
    [event] = client.get("/orgs/mixed/events").json()
    assert [fight["discipline"] for fight in event["fights"]] == ["Muay Thai", "MMA", None]


def test_the_sport_is_served_with_a_fighters_history_and_the_record_still_counts_every_bout(client, mixed_sports_org):
    history = client.get("/orgs/mixed/fighters/Ana Silva/fights").json()
    fought = [fight for fight in history if fight["result"]]  # the card still to come is in the history too, without a result
    assert {fight["opponent"]: fight["discipline"] for fight in fought} == {"Bia Costa": "Muay Thai", "Caio Dias": "MMA"}
    assert {fight["opponent"]: fight["discipline"] for fight in history if not fight["result"]} == {"Caio Dias": "Muay Thai", "Dora Reis": None}
    ana = next(fighter for fighter in client.get("/orgs/mixed/fighters").json() if fighter["name"] == "Ana Silva")
    assert ana["org_record"] == "1-1-0"  # the Muay Thai win and the MMA loss both count: the bouts are flagged, the record is kept


def test_a_file_without_the_column_serves_no_sport(client, org):
    [past, _] = client.get("/orgs/test/events").json()
    assert all(fight["discipline"] is None for fight in past["fights"])


class StubModel:
    """Stands in for the prediction model: answers for any two names and remembers who it was asked about."""

    def __init__(self):
        self.asked = []

    def predict_pick(self, a, b):
        self.asked.append((a, b))
        return {"predicted_winner": a, "probability": 0.7, "fighter_a_probability": 0.7}


def test_a_prediction_is_made_only_for_a_bout_the_source_says_is_mma(mixed_sports_org):
    model = StubModel()
    picks = org_service.get_org_upcoming_predictions("mixed", model)
    # The model is trained on MMA only: the Muay Thai and the kickboxing bout get none, and neither does the one whose
    # source does not say its sport (it may be something else). Only the bout named MMA does.
    assert [(pick["fighter_1"], pick["fighter_2"]) for pick in picks] == [("Bia Costa", "Dora Reis")]
    assert model.asked == [("Bia Costa", "Dora Reis")]  # the model was not even asked about the others


@pytest.mark.parametrize(
    ("discipline", "expected"),
    [("MMA", True), ("mma", True), (" MMA ", True), ("Muay Thai", False), ("Kickboxing", False), ("Submission Grappling", False), ("Grappling", False), ("", False), (None, False)],
)
def test_only_a_bout_named_mma_counts_as_mma(discipline, expected):
    assert org_service.is_mma(discipline) is expected


STRIKING_FIELDS = (
    "sig_str_acc", "sig_strikes_landed_per_min", "sig_strikes_absorbed_per_min", "striking_defense",
    "takedown_avg_per_15min", "takedown_acc", "takedown_defense", "submission_avg_per_15min",
)


def test_a_fighter_with_no_ufc_statistics_has_no_striking_numbers_instead_of_estimated_ones(org):
    # The API does not send these fields, but the model profile and the predictor are built from the same data.
    for fighter in org_service.get_org_fighters("test"):
        assert [fighter[field] for field in STRIKING_FIELDS] == [None] * len(STRIKING_FIELDS), fighter["name"]


def test_the_model_profile_of_such_a_fighter_leaves_blank_what_the_file_does_not_have(org):
    from backend.app.services.catalog_service import get_fighter_profile

    profile = get_fighter_profile("Caio Dias")
    assert profile["data_origin"] == "test"
    assert profile["wins"] == 12
    # Age, height, reach and the striking numbers are not in the file: blank, not an average shown as if measured.
    assert [profile[field] for field in ("age", "height_cm", "reach_cm", "weight_lbs", "sig_str_acc", "takedown_acc")] == [None] * 6


def test_season_stats_come_with_the_fighter_newest_first_and_a_page_without_stats_adds_nothing(client, org):
    _write(
        org.data_dir / "fighter_stats.csv",
        ["slug", "season", "max_punch_speed_mph", "strikes", "arm_strikes", "takedowns", "checked"],
        [
            {"slug": "ana-silva", "season": "2024", "strikes": "9/28", "takedowns": "0/0"},
            {"slug": "ana-silva", "season": "2025", "max_punch_speed_mph": "17.55", "strikes": "76/144", "arm_strikes": "27/53"},
            {"slug": "bia-costa", "season": ""},  # the page was read and printed nothing
        ],
    )
    by_name = {fighter["name"]: fighter for fighter in client.get("/orgs/test/fighters").json()}
    ana = by_name["Ana Silva"]["season_stats"]
    assert [season["season"] for season in ana] == [2025, 2024]
    assert ana[0]["strikes"] == "76/144" and ana[0]["max_punch_speed_mph"] == "17.55" and ana[0]["arm_strikes"] == "27/53"
    assert ana[1]["max_punch_speed_mph"] is None and ana[1]["takedowns"] == "0/0"
    assert by_name["Bia Costa"]["season_stats"] == [] and by_name["Caio Dias"]["season_stats"] == []
