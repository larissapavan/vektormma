"""OKTAGON (read from its own site), Jungle Fight and Invicta FC (read from Sherdog), served from data/raw/<org>/.

Unlike the ESPN organisations these sources do flag title bouts, but none gives a rankings list, so the tests hold the
pages to that: fights, fighters and upcoming cards are there and consistent, and no ranking or belt-holder is claimed."""

from __future__ import annotations

from datetime import date

import pytest

from backend.app.services import crossorg_service as crossorg

SOURCES = {"oktagon": "oktagonmma.com", "jungle-fight": "sherdog.com", "invicta": "sherdog.com"}
SHORT_NAMES = {"oktagon": "OKTAGON", "jungle-fight": "Jungle Fight", "invicta": "Invicta FC"}


def test_the_three_organisations_are_listed_with_their_names_and_source(client):
    listed = {org["id"]: org for org in client.get("/orgs").json()}
    for org_id, source in SOURCES.items():
        assert listed[org_id]["short_name"] == SHORT_NAMES[org_id] and listed[org_id]["sources"] == [source]


@pytest.mark.parametrize("org_id", SOURCES)
def test_fighters_and_events_are_there_and_agree_with_each_other(client, org_id):
    fighters = client.get(f"/orgs/{org_id}/fighters")
    events = client.get(f"/orgs/{org_id}/events").json()
    assert fighters.status_code == 200 and int(fighters.headers["X-Total-Count"]) == len(fighters.json()) > 300
    assert len(events) > 50

    names = {fighter["name"] for fighter in fighters.json()}
    for event in events:
        assert event["name"] and event["date"] and event["fight_count"] == len(event["fights"]) > 0
        for fight in event["fights"]:
            assert fight["fighter_1"] in names and fight["fighter_2"] in names  # every fighter on a card has a profile
            assert fight["winner"] in (None, fight["fighter_1"], fight["fighter_2"])
    dates = [event["date"] for event in events]
    assert dates == sorted(dates, reverse=True)  # newest first, as on the other organisations


@pytest.mark.parametrize("org_id", SOURCES)
def test_title_bouts_are_flagged_but_no_ranking_or_belt_holder_is_claimed(client, org_id):
    assert client.get(f"/orgs/{org_id}/rankings").json() == []
    fighters = client.get(f"/orgs/{org_id}/fighters").json()
    assert not any(fighter["belt"] or fighter["title_status"] or fighter["ranking"] for fighter in fighters)
    events = client.get(f"/orgs/{org_id}/events").json()
    titles = [fight for event in events for fight in event["fights"] if fight["title_fight"]]
    assert len(titles) > 20 and all(fight["stage"] == "Title Fight" for fight in titles)


@pytest.mark.parametrize("org_id", SOURCES)
def test_the_data_note_counts_what_the_lists_hold(client, org_id):
    info = client.get(f"/orgs/{org_id}/data-info").json()
    events = client.get(f"/orgs/{org_id}/events").json()
    assert info["fighters_count"] == len(client.get(f"/orgs/{org_id}/fighters").json())
    assert info["events_count"] == len(events)  # the note counts the events already held; the cards to come are listed apart
    assert info["fights_count"] == sum(event["fight_count"] for event in events)
    assert info["sources"] == [SOURCES[org_id]]


@pytest.mark.parametrize("org_id", SOURCES)
def test_a_finished_event_has_results_and_a_card_to_come_has_none(client, org_id):
    today = date.today().isoformat()
    for event in client.get(f"/orgs/{org_id}/events").json():
        assert event["date"] <= today or all(not fight["winner"] for fight in event["fights"])
        if event["date"] < today:
            assert any(fight["method"] for fight in event["fights"])
    for event in client.get(f"/orgs/{org_id}/events/upcoming").json():
        assert event["date"] >= today and all(fight["winner"] is None and fight["method"] is None for fight in event["fights"])


def test_oktagon_has_cards_still_to_come(client):
    assert client.get("/orgs/oktagon/events/upcoming").json()  # its site lists the next cards, with the bouts announced so far


def test_invicta_is_a_womens_promotion_so_every_named_division_says_so(client):
    divisions = {fight["weight_class"] for event in client.get("/orgs/invicta/events").json() for fight in event["fights"]} - {None, "Catch Weight"}
    assert divisions and all(name.startswith("Women's") for name in divisions)


@pytest.mark.parametrize("org_id", SOURCES)
def test_a_fighter_who_also_fought_in_the_ufc_points_to_the_ufc_profile_and_passes_the_guards(client, org_id):
    catalog = {record["name"]: record for record in client.get("/fighters").json()}
    linked = [fighter for fighter in client.get(f"/orgs/{org_id}/fighters").json() if fighter["ufc_name"]]
    assert linked
    for fighter in linked:
        ufc = catalog[fighter["ufc_name"]]
        assert ufc["ufc_status"] != "never"
        assert crossorg._linked((ufc["name"], ufc["division"]), fighter["division"])
