"""The column form of the fighter list: the same fighters, a fraction of the size."""

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
