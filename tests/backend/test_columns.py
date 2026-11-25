"""The column form of the long lists: the same rows, a fraction of the size."""

import gzip

import pytest

from backend.app.routers.fighters import LIST_LEAVES_OUT


def test_the_columns_hold_the_same_fighters_as_the_list(client):
    listed = client.get("/fighters", params={"ufc_only": True}).json()
    body = client.get("/fighters", params={"ufc_only": True, "columns": True}).json()
    assert body["count"] == len(listed) > 1000
    assert set(body["columns"]) == set(listed[0]) - LIST_LEAVES_OUT
    assert all(len(values) == body["count"] for values in body["columns"].values())
    for row in range(0, body["count"], 97):
        for field, values in body["columns"].items():
            expected = listed[row][field]
            assert values[row] == (pytest.approx(expected, abs=0.0006) if isinstance(expected, float) else expected), field


def test_the_columns_are_at_most_two_thirds_of_the_list_on_the_wire(client):
    sizes = [len(gzip.compress(client.get("/fighters", params={"ufc_only": True, "columns": flag}).content, 6)) for flag in (False, True)]
    assert sizes[1] < sizes[0] * 2 / 3


def test_paging_and_the_plain_list_stay_as_they_were(client):
    page = client.get("/fighters", params={"limit": 3, "offset": 2})
    assert isinstance(page.json(), list) and len(page.json()) == 3 and int(page.headers["x-total-count"]) > 1000
    assert client.get("/fighters", params={"limit": 3, "columns": True}).json()["count"] == 3


def rebuilt(body):
    """What frontend/src/shared/services/columns.ts does."""
    def rows(part):
        return [{field: values[i] for field, values in part["columns"].items()} for i in range(part["count"])]

    fights, events, at = rows(body["fights"]), [], 0
    for event in rows(body["events"]):
        own = fights[at : at + event.pop("listed")]
        at += len(own)
        for fight in own:
            fight["winner"] = fight[f"fighter_{fight['winner']}"] if fight["winner"] in (1, 2) else fight["winner"]
        events.append({**event, "fights": own})
    assert at == len(fights)
    return events


@pytest.mark.parametrize("path", ["/events", "/orgs/one/events", "/orgs/pfl/events"])
def test_the_events_come_back_the_same_but_for_the_key_nobody_shows(client, path):
    plain, small = client.get(path), client.get(path, params={"columns": True})
    expected = [{**event, "fights": [{k: v for k, v in fight.items() if k != "fight_url"} for fight in event["fights"]]} for event in plain.json()]
    assert rebuilt(small.json()) == expected
    assert small.headers["cache-control"] == plain.headers["cache-control"]
    assert len(gzip.compress(small.content, 6)) < len(gzip.compress(plain.content, 6)) * 0.7


@pytest.mark.parametrize("org", ["pfl", "lfa", "one"])
def test_an_organization_s_fighters_come_back_the_same(client, org):
    plain, small = client.get(f"/orgs/{org}/fighters"), client.get(f"/orgs/{org}/fighters", params={"columns": True})
    body, listed = small.json(), plain.json()
    assert body["count"] == len(listed) and set(body["columns"]) == set(listed[0])
    for row in range(0, len(listed), 41):
        for field, values in body["columns"].items():
            expected = listed[row][field]
            assert values[row] == (pytest.approx(expected, abs=0.0006) if isinstance(expected, float) else expected), field
    for header in ("x-total-count", "cache-control"):
        assert small.headers[header] == plain.headers[header]
    # The PFL prints statistics by season, which stay as they are inside their column: it gains the least.
    assert len(small.content) < len(plain.content) * 0.7


def test_linking_an_organization_to_the_ufc_reads_the_catalog_once(monkeypatch):
    from backend.app.services import crossorg_service

    calls = []
    real = crossorg_service.get_fighter_catalog
    monkeypatch.setattr(crossorg_service, "get_fighter_catalog", lambda: calls.append(1) or real())
    links = crossorg_service.ufc_names_for_org("pfl")
    assert links and len(calls) == 1
    from backend.app.services.org_service import get_org_fighters

    for fighter in get_org_fighters("pfl")[:60]:  # the same answer as asking one by one
        assert links.get(crossorg_service._name_key(fighter["name"])) == crossorg_service.ufc_name_for(fighter["name"], fighter["division"])


def test_an_empty_list_has_columns_too():
    from backend.app.utils.columns import events_to_columns, to_columns

    assert to_columns([]) == {"count": 0, "columns": {}}
    assert events_to_columns([]) == {"events": {"count": 0, "columns": {}}, "fights": {"count": 0, "columns": {}}}
