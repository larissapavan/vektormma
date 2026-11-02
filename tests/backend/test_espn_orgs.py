"""RIZIN, KSW, LFA and Cage Warriors, served from the CSV files scripts/scrape_espn_org.py wrote (data/raw/<org>/).

ESPN has fighters and results for these leagues but no belts or rankings, so the tests hold the pages to exactly that:
the lists are there and consistent, and nothing claims a title or a ranking that the source does not give."""

from __future__ import annotations

import pytest

from backend.app.services import crossorg_service as crossorg

ESPN_ORGS = {"rizin": "RIZIN", "ksw": "KSW", "lfa": "LFA", "cage-warriors": "Cage Warriors"}
# RIZIN and KSW stop at the end of 2024 on ESPN; their later events come from Sherdog, which also flags title bouts.
SOURCES = {"rizin": ["espn.com", "sherdog.com"], "ksw": ["espn.com", "sherdog.com"], "lfa": ["espn.com"], "cage-warriors": ["espn.com"]}
SHERDOG_FROM = "2025-01-01"


def test_the_four_organisations_are_listed_with_their_names_and_source(client):
    listed = {org["id"]: org for org in client.get("/orgs").json()}
    for org_id, short_name in ESPN_ORGS.items():
        assert listed[org_id]["short_name"] == short_name
        assert listed[org_id]["sources"] == SOURCES[org_id]


@pytest.mark.parametrize("org_id", ESPN_ORGS)
def test_fighters_and_events_are_there_and_agree_with_each_other(client, org_id):
    fighters = client.get(f"/orgs/{org_id}/fighters")
    events = client.get(f"/orgs/{org_id}/events").json()
    assert fighters.status_code == 200 and int(fighters.headers["X-Total-Count"]) == len(fighters.json()) > 100
    assert len(events) > 50

    names = {fighter["name"] for fighter in fighters.json()}
    for event in events:
        assert event["name"] and event["date"] and event["fight_count"] == len(event["fights"]) > 0
        for fight in event["fights"]:
            assert fight["fighter_1"] in names and fight["fighter_2"] in names  # every fighter on a card has a profile
            assert fight["winner"] in (None, fight["fighter_1"], fight["fighter_2"])
    dates = [event["date"] for event in events]
    assert dates == sorted(dates, reverse=True)  # newest first, as on the other organisations


@pytest.mark.parametrize("org_id", ESPN_ORGS)
def test_nothing_claims_a_title_a_ranking_or_a_photo_that_espn_did_not_give(client, org_id):
    assert client.get(f"/orgs/{org_id}/rankings").json() == []
    fighters = client.get(f"/orgs/{org_id}/fighters").json()
    assert not any(fighter["belt"] or fighter["title_status"] or fighter["ranking"] for fighter in fighters)
    events = client.get(f"/orgs/{org_id}/events").json() + client.get(f"/orgs/{org_id}/events/upcoming").json()
    # ESPN flags no title bout: any flagged one must be in an event Sherdog added (RIZIN and KSW, from 2025 on).
    titled = [event["date"] for event in events for fight in event["fights"] if fight["title_fight"]]
    assert all(day >= SHERDOG_FROM for day in titled) and (bool(titled) == (len(SOURCES[org_id]) == 2))


@pytest.mark.parametrize("org_id", ESPN_ORGS)
def test_the_data_note_counts_what_the_lists_hold(client, org_id):
    info = client.get(f"/orgs/{org_id}/data-info").json()
    events = client.get(f"/orgs/{org_id}/events").json()
    assert info["fighters_count"] == len(client.get(f"/orgs/{org_id}/fighters").json())
    assert info["events_count"] == len(events)
    assert info["fights_count"] == sum(event["fight_count"] for event in events)
    assert info["sources"] == SOURCES[org_id]


@pytest.mark.parametrize("org_id", ESPN_ORGS)
def test_a_fighter_who_also_fought_in_the_ufc_points_to_the_ufc_profile_and_passes_the_guards(client, org_id):
    catalog = {record["name"]: record for record in client.get("/fighters").json()}
    linked = [fighter for fighter in client.get(f"/orgs/{org_id}/fighters").json() if fighter["ufc_name"]]
    assert linked  # every one of these organisations has alumni who reached the UFC
    for fighter in linked:
        ufc = catalog[fighter["ufc_name"]]
        assert ufc["ufc_status"] != "never"
        assert crossorg._linked((ufc["name"], ufc["division"]), fighter["division"])


def test_the_gyms_page_counts_the_fighters_of_the_new_organisations(client):
    gyms = client.get("/gyms").json()
    counted = {org_id for gym in gyms for org_id in gym["orgs"]}
    assert set(ESPN_ORGS) <= counted


def test_the_site_wide_counts_include_the_new_organisations(client):
    total = client.get("/data-info").json()
    own = sum(client.get(f"/orgs/{org_id}/data-info").json()["fights_count"] for org_id in ESPN_ORGS)
    assert total["fights_count"] > own  # the UFC and the other organisations come on top


@pytest.mark.parametrize("org_id", ["rizin", "ksw"])
def test_the_events_from_2025_on_come_after_espns_without_repeating_or_losing_any(client, org_id):
    events = client.get(f"/orgs/{org_id}/events").json()
    upcoming = client.get(f"/orgs/{org_id}/events/upcoming").json()
    before, after = [e for e in events if e["date"] < SHERDOG_FROM], [e for e in events if e["date"] >= SHERDOG_FROM]
    assert before and after and upcoming  # ESPN's years, the years Sherdog added, and the cards still to come
    assert max(e["date"] for e in before) >= "2024-12-01"  # ESPN's last event is still the one it was
    slugs = [e["slug"] for e in events + upcoming]
    assert len(slugs) == len(set(slugs))  # no card twice
    assert all("-sherdog-" in e["slug"] for e in after + upcoming) and not any("-sherdog-" in e["slug"] for e in before)
    # the same two people do not meet twice on the same day (the same card read from two sources)
    seen = set()
    for event in events + upcoming:
        for fight in event["fights"]:
            key = (event["date"], frozenset((fight["fighter_1"], fight["fighter_2"])))
            assert key not in seen
            seen.add(key)


@pytest.mark.parametrize("org_id", ["rizin", "ksw"])
def test_a_fighter_on_both_sides_of_2025_is_one_profile_with_one_history(client, org_id):
    fighters = client.get(f"/orgs/{org_id}/fighters").json()
    names = [fighter["name"].lower() for fighter in fighters]
    assert len(names) == len(set(names))
    events = client.get(f"/orgs/{org_id}/events").json()
    appears = {}
    for event in events:
        for fight in event["fights"]:
            for name in (fight["fighter_1"], fight["fighter_2"]):
                appears.setdefault(name, set()).add(event["date"] >= SHERDOG_FROM)
    both = [name for name, sides in appears.items() if sides == {True, False}]
    assert both  # fighters who fought for the organization before and after 2025
    name = both[0]
    history = client.get(f"/orgs/{org_id}/fighters/{name}/fights").json()
    assert any(f["date"] >= SHERDOG_FROM for f in history) and any(f["date"] < SHERDOG_FROM for f in history)


@pytest.mark.parametrize(
    ("org_id", "sherdog_spelling", "files_spelling"),
    [("ksw", "Oleksii Polishchuk", "Oleksii Polischuck"), ("ksw", "Patryk Surdyn", "Patrick Surdyn"), ("rizin", "Kyung Pyo Kim", "KyeungPyo Kim")],
)
def test_a_person_spelled_differently_by_the_two_sources_is_one_profile_with_the_whole_history(client, org_id, sherdog_spelling, files_spelling):
    names = {fighter["name"] for fighter in client.get(f"/orgs/{org_id}/fighters").json()}
    assert files_spelling in names and sherdog_spelling not in names  # confirmed by hand: kept in the spelling the files had
    history = client.get(f"/orgs/{org_id}/fighters/{files_spelling}/fights").json()
    assert any(fight["date"] < SHERDOG_FROM for fight in history) and any(fight["date"] >= SHERDOG_FROM for fight in history)
    events = client.get(f"/orgs/{org_id}/events").json() + client.get(f"/orgs/{org_id}/events/upcoming").json()
    assert not any(sherdog_spelling in (fight["fighter_1"], fight["fighter_2"]) for event in events for fight in event["fights"])
