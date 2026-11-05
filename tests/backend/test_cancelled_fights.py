from backend.app.services import cancelled_fights_service
from backend.app.services.cancelled_fights_service import has_taken_place, load_cancelled_rows


def test_the_endpoint_lists_the_cancelled_fights_newest_booking_first(client):
    response = client.get("/cancelled-fights")
    assert response.status_code == 200
    assert "max-age" in response.headers["cache-control"]

    fights = response.json()["fights"]
    assert len(fights) >= 5
    dates = [fight["event_date"] for fight in fights]
    assert dates == sorted(dates, reverse=True)
    assert len({fight["id"] for fight in fights}) == len(fights)
    for fight in fights:
        assert fight["fighter_1"]["name"] != fight["fighter_2"]["name"]
        assert fight["reason"] in {"injury", "missed_weight", "travel_restrictions", "event_cancelled", "other"}
        assert fight["attempts"] >= 1
        assert fight["weight_class"]


def test_every_listed_fight_is_one_the_data_says_never_took_place(client):
    for fight in client.get("/cancelled-fights").json()["fights"]:
        assert not has_taken_place(fight["fighter_1"]["name"], fight["fighter_2"]["name"], fight["event_date"])


def test_the_khabib_ferguson_saga_counts_every_booking(client):
    fights = {fight["id"]: fight for fight in client.get("/cancelled-fights").json()["fights"]}
    saga = fights["khabib-vs-ferguson"]
    assert saga["attempts"] == 5
    assert saga["event_name"] == "UFC 249"
    assert saga["title_fight"] is True


def test_the_model_only_picks_when_both_fighters_are_active(client):
    for fight in client.get("/cancelled-fights").json()["fights"]:
        both_active = fight["fighter_1"]["ufc_status"] == "active" and fight["fighter_2"]["ufc_status"] == "active"
        if fight["model"] is None:
            continue
        assert both_active, fight["id"]
        assert fight["model"]["predicted_winner"] in (fight["fighter_1"]["name"], fight["fighter_2"]["name"])
        assert 0.5 <= fight["model"]["probability"] <= 1.0
        assert 0.0 <= fight["model"]["fighter_1_probability"] <= 1.0
    # Khabib and Ferguson no longer compete: no pick for them.
    fights = {fight["id"]: fight for fight in client.get("/cancelled-fights").json()["fights"]}
    assert fights["khabib-vs-ferguson"]["model"] is None


def test_a_pair_that_fought_after_the_booked_date_has_taken_place():
    # Jones and Gustafsson fought in 2013 and again in December 2018.
    assert has_taken_place("Jon Jones", "Alexander Gustafsson", "2014-09-27")
    assert not has_taken_place("Jon Jones", "Alexander Gustafsson", "2019-01-01")
    assert not has_taken_place("Khabib Nurmagomedov", "Tony Ferguson", "2020-04-18")


def test_a_fight_that_took_place_after_all_drops_out_of_the_list(monkeypatch):
    monkeypatch.setattr(cancelled_fights_service, "has_taken_place", lambda first, second, booked: first == "Jon Jones")
    monkeypatch.setattr(cancelled_fights_service, "_cache", {"signature": None, "service": None, "data": None})
    ids = {fight["id"] for fight in cancelled_fights_service.get_cancelled_fights(None)}
    assert "jones-vs-henderson" not in ids
    assert "khabib-vs-ferguson" in ids


def test_the_file_is_well_formed():
    from scripts.validate_data import cancelled_fight_problems

    assert cancelled_fight_problems() == []
    assert len(load_cancelled_rows()) >= 5
