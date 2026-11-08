import os
from datetime import date

import pytest

from backend.app.services import catalog_service


@pytest.fixture
def counted(tmp_path, monkeypatch):
    """list_fighters with a fake builder, over a folder of its own, so only the cache is under test."""
    (tmp_path / "fights.csv").write_text("a\n", encoding="utf-8")
    monkeypatch.setattr(catalog_service, "RAW_DATA_DIR", tmp_path)
    monkeypatch.setitem(catalog_service._profiles_cache, "signature", None)
    monkeypatch.setitem(catalog_service._profiles_cache, "data", {})  # both put back after the test: no fake profiles left behind
    calls = []

    def build(ufc_only):
        calls.append(ufc_only)
        return [{"name": "Alpha One", "ufc_only": ufc_only}]

    monkeypatch.setattr(catalog_service, "_build_profiles", build)
    return tmp_path, calls


def test_the_list_is_built_once_while_the_data_does_not_change(counted):
    _, calls = counted
    for _ in range(3):
        assert catalog_service.list_fighters(ufc_only=True)[0]["name"] == "Alpha One"
    assert calls == [True]
    catalog_service.list_fighters(ufc_only=False)  # the other flavour is its own list
    assert calls == [True, False]


def test_each_caller_gets_its_own_copy(counted):
    first = catalog_service.list_fighters(ufc_only=True)
    first[0]["name"] = "Changed by a caller"
    assert catalog_service.list_fighters(ufc_only=True)[0]["name"] == "Alpha One"


def test_a_changed_data_file_rebuilds_the_list(counted):
    folder, calls = counted
    catalog_service.list_fighters(ufc_only=True)
    fights = folder / "fights.csv"
    stamp = fights.stat().st_mtime_ns + 5_000_000_000
    os.utime(fights, ns=(stamp, stamp))
    catalog_service.list_fighters(ufc_only=True)
    assert calls == [True, True]


def test_a_new_file_or_a_new_day_rebuilds_it_too(counted, monkeypatch):
    folder, calls = counted
    catalog_service.list_fighters(ufc_only=True)
    (folder / "fighter_photos.csv").write_text("x\n", encoding="utf-8")
    catalog_service.list_fighters(ufc_only=True)
    assert len(calls) == 2

    class Tomorrow(date):
        @classmethod
        def today(cls):
            return date(2099, 1, 1)

    monkeypatch.setattr(catalog_service, "date", Tomorrow)  # ages are computed from today
    catalog_service.list_fighters(ufc_only=True)
    assert len(calls) == 3
