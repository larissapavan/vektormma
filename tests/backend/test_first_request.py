"""The first visitor after a start must not wait for work nobody needs yet."""

import threading
import time

import pytest

from backend.app.services import data_info_service, events_service, org_service
from backend.app.services.org_service import ORGS


@pytest.mark.parametrize("org_id", sorted(ORGS))
def test_the_quick_counts_are_those_of_the_built_organization(org_id, monkeypatch):
    built = org_service._data(org_id)
    monkeypatch.setattr(org_service, "_cache", {})
    assert org_service.get_org_counts(org_id) == {
        "fighters": len(built["fighters"]), "events": len(built["events"]), "fights": sum(len(event["fights"]) for event in built["events"]),
    }


def test_data_info_does_not_build_any_organization(monkeypatch):
    monkeypatch.setattr(org_service, "_cache", {})
    monkeypatch.setattr(org_service, "_build", lambda org: pytest.fail(f"built {org.id}"))
    assert data_info_service.get_data_info()["fighters_count"] > 10_000


def test_an_organization_that_cannot_be_counted_does_not_take_the_others_with_it(monkeypatch):
    def counts(org_id):
        if org_id == "pfl":
            raise OSError("unreadable")
        return {"fighters": 1, "events": 1, "fights": 1}

    monkeypatch.setattr(data_info_service, "get_org_counts", counts)
    without = data_info_service.get_data_info()["events_count"]
    monkeypatch.setattr(data_info_service, "get_org_counts", lambda org_id: {"fighters": 1, "events": 1, "fights": 1})
    assert data_info_service.get_data_info()["events_count"] == without + 1


def test_visitors_who_arrive_together_wait_for_one_build(monkeypatch):
    builds = []

    def slow(org):
        builds.append(org.id)
        time.sleep(0.05)
        return {"fighters": [], "events": [], "fights_count": 0}

    monkeypatch.setattr(org_service, "_cache", {})
    monkeypatch.setattr(org_service, "_build", slow)
    threads = [threading.Thread(target=org_service.get_org_fighters, args=("pfl",)) for _ in range(4)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert builds == ["pfl"]


def test_the_quick_event_count_is_that_of_the_built_events(monkeypatch):
    built = len(events_service.get_events())
    assert events_service.get_event_count() == built
    monkeypatch.setattr(events_service, "_events_cache", {"signature": None, "data": None})
    assert events_service.get_event_count() == built


def test_data_info_does_not_build_the_events(monkeypatch):
    monkeypatch.setattr(events_service, "_events_cache", {"signature": None, "data": None})
    monkeypatch.setattr(events_service, "_build_events", lambda *args, **kwargs: pytest.fail("built the events"))
    assert data_info_service.get_data_info()["events_count"] > 2000
