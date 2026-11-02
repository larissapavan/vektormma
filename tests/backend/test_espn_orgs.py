"""RIZIN, KSW, LFA and Cage Warriors, served from the CSV files scripts/scrape_espn_org.py wrote (data/raw/<org>/).

ESPN has fighters and results for these leagues but no belts or rankings, so the tests hold the pages to exactly that:
the lists are there and consistent, and nothing claims a title or a ranking that the source does not give."""

from __future__ import annotations

import pytest

from backend.app.services import crossorg_service as crossorg

ESPN_ORGS = {"rizin": "RIZIN", "ksw": "KSW", "lfa": "LFA", "cage-warriors": "Cage Warriors"}


def test_the_four_organisations_are_listed_with_their_names_and_source(client):
    listed = {org["id"]: org for org in client.get("/orgs").json()}
    for org_id, short_name in ESPN_ORGS.items():
        assert listed[org_id]["short_name"] == short_name
        assert listed[org_id]["sources"] == ["espn.com"]


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
    events = client.get(f"/orgs/{org_id}/events").json()
    assert not any(fight["title_fight"] for event in events for fight in event["fights"])


@pytest.mark.parametrize("org_id", ESPN_ORGS)
def test_the_data_note_counts_what_the_lists_hold(client, org_id):
    info = client.get(f"/orgs/{org_id}/data-info").json()
    events = client.get(f"/orgs/{org_id}/events").json()
    assert info["fighters_count"] == len(client.get(f"/orgs/{org_id}/fighters").json())
    assert info["events_count"] == len(events)
    assert info["fights_count"] == sum(event["fight_count"] for event in events)
    assert info["sources"] == ["espn.com"]


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
