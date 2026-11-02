"""The ESPN collector for RIZIN, KSW, LFA and Cage Warriors, run against small answers that copy the shape of ESPN's."""

from __future__ import annotations

import csv
from datetime import date

import pytest

from backend.app.services.org_service import ORGS
from scripts import scrape_espn_org as esp
from scripts.scrape_pfl import FIGHT_FIELDS, FIGHTER_FIELDS, RANKING_FIELDS

LFA, KSW, RIZIN, CAGE = (esp.LEAGUES[key] for key in ("lfa", "ksw", "rizin", "cage-warriors"))


def competitor(athlete_id, name, order, winner=False, record="10-2-0", flag="USA"):
    return {"id": athlete_id, "order": order, "winner": winner, "athlete": {"displayName": name, "flag": {"alt": flag}}, "records": [{"summary": record}]}


def competition(comp_id, fighters, *, completed=True, period=3, clock="5:00", kind=None, venue=None):
    comp = {
        "id": comp_id, "competitors": fighters, "format": {"regulation": {"periods": 3}},
        "status": {"period": period, "displayClock": clock, "type": {"completed": completed}},
    }
    if kind:
        comp["type"] = {"id": "1003", "abbreviation": kind}
    if venue:
        comp["venue"] = venue
    return comp


def scoreboard(*competitions, name="LFA 198: Miranda vs. Oyarzun", date_text="2024-12-06T05:00Z", venues=None):
    return {"events": [{"id": "600", "name": name, "date": date_text, "venues": venues or [], "competitions": list(competitions)}]}


def two(comp_id="1", **extra):
    return competition(comp_id, [competitor("a", "Ana One", 1), competitor("b", "Bia Two", 2, winner=True)], **extra)


def test_every_league_is_a_registered_organisation_with_the_same_id_and_a_data_folder_of_that_name():
    for key, league in esp.LEAGUES.items():
        assert key == league.id and league.id in ORGS
        assert ORGS[league.id].data_dir.name == league.id


def test_the_venue_comes_from_the_event_or_else_from_a_bout():
    on_event = scoreboard(two(), venues=[{"address": {"city": "Phoenix", "state": "AZ", "country": "USA"}}], date_text="2024-12-06T23:00Z")
    on_bout = scoreboard(two(venue={"address": {"city": "Warsaw", "country": "Poland"}}), date_text="2024-12-06T18:00Z")
    nowhere = scoreboard(two(), date_text="2024-12-06T18:00Z")
    assert esp.parse_events(on_event, LFA)[0]["location"] == "Phoenix, AZ, USA"
    assert esp.parse_events(on_bout, KSW)[0]["location"] == "Warsaw, Poland"
    assert esp.parse_events(nowhere, KSW)[0]["location"] == ""


def test_an_evening_card_in_the_americas_keeps_its_local_date_and_one_in_europe_does_not():
    us = {"address": {"country": "USA"}}
    assert esp.event_day("2024-12-06T05:00Z", us, False) == date(2024, 12, 5)
    assert esp.event_day("2024-12-06T05:00Z", {"address": {"country": "Colombia"}}, False) == date(2024, 12, 5)
    assert esp.event_day("2024-12-06T05:00Z", {"address": {"country": "Poland"}}, True) == date(2024, 12, 6)  # the venue wins over the league default
    assert esp.event_day("2024-12-06T18:00Z", us, False) == date(2024, 12, 6)  # afternoon: the same day everywhere


def test_a_card_with_no_venue_takes_the_leagues_default_region():
    nowhere = scoreboard(two(), date_text="2024-12-06T05:00Z")
    assert esp.parse_events(nowhere, LFA)[0]["day"] == date(2024, 12, 5)  # LFA: almost always the Americas
    assert esp.parse_events(nowhere, KSW)[0]["day"] == date(2024, 12, 6)  # KSW: not assumed


def test_the_event_name_loses_a_prefix_that_adds_nothing_and_keeps_everything_else():
    payload = scoreboard(two(), name="Rizin FF: Rizin Fighting Federation 40", date_text="2022-12-31T09:00Z")
    assert esp.parse_events(payload, RIZIN)[0]["name"] == "Rizin Fighting Federation 40"
    assert esp.parse_events(scoreboard(two(), name="Rizin FF: Rizin Fighting Federation 40"), KSW)[0]["name"] == "Rizin FF: Rizin Fighting Federation 40"


def test_the_main_event_is_first_placeholders_are_skipped_and_the_division_is_the_one_espn_names():
    payload = scoreboard(
        competition("1", [competitor("a", "Prelim One", 1), competitor("b", "Prelim Two", 2, winner=True)]),
        competition("2", [competitor("c", "TBD", 1), competitor("d", "Somebody", 2)]),
        competition("3", [competitor("e", "Main One", 1, winner=True), competitor("f", "Main Two", 2)], kind="W Bantamweight", period=1, clock="2:30"),
    )
    [event] = esp.parse_events(payload, LFA)
    assert [bout["competition_id"] for bout in event["bouts"]] == ["3", "1"]
    main, prelim = event["bouts"]
    assert (main["weight_class"], main["round"], main["time"], main["winner_index"]) == ("Women's Bantamweight", "1.0", "2:30", 0)
    assert prelim["weight_class"] == ""


def test_fight_rows_name_the_league_and_never_claim_a_title_fight():
    to_come = competition("8", [competitor("c", "Cal Three", 1), competitor("d", "Dan Four", 2)], completed=False)
    [event] = esp.parse_events(scoreboard(two("9"), to_come), CAGE)
    rows = esp.fight_rows([event], {"9": ("KO/TKO", "Punches")}, CAGE)
    assert [row["card_order"] for row in rows] == [0, 1]
    assert all(row["event_slug"] == "cage-warriors-600" and row["event_url"].endswith("/league/cage-warriors") for row in rows)
    assert all(row["title_fight"] == "" and row["stage"] == "" for row in rows)
    upcoming, fought = rows  # the bout to come is listed first; the fought one has its result
    assert (upcoming["outcome"], upcoming["winner"], upcoming["method"]) == ("", "", "")
    assert (fought["winner"], fought["method"], fought["method_detail"], fought["round"], fought["time"]) == ("Bia Two", "KO/TKO", "Punches", "3", "5:00")


class FakeFetcher:
    """Answers like ESPN for one league with one event and two bouts; remembers what was asked."""

    failures = 0

    def __init__(self):
        self.asked: list[str] = []

    def get(self, url, params=None, *, optional=False):
        self.asked.append(url)
        if "/scoreboard" in url:
            year = int(params["dates"][:4])
            return scoreboard(two("1"), two("2"), date_text="2023-05-06T18:00Z") if year == 2023 else {"events": []}
        if url.endswith("/status?lang=en"):
            return {"result": {"displayName": "Decision - Unanimous"}}
        athlete = {"nickname": "", "age": 30, "height": 70.0, "weight": 155.0, "citizenship": "USA", "active": True, "weightClass": {"text": "Lightweight"}}
        return athlete


def run(tmp_path, monkeypatch, *, dry_run):
    monkeypatch.setattr(esp, "RAW_DATA_DIR", tmp_path)
    fetcher = FakeFetcher()
    league = esp.League("lfa", "lfa", 2022, default_americas=True)
    status = esp.collect(league, fetcher, dry_run=dry_run, photos=False, photo_limit=0, delay=0)
    return status, fetcher, tmp_path / "lfa"


def read(path):
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def test_a_run_writes_the_three_files_every_organisation_has(tmp_path, monkeypatch):
    status, fetcher, folder = run(tmp_path, monkeypatch, dry_run=False)
    assert status == 0
    fights, fighters = read(folder / "fights.csv"), read(folder / "fighters.csv")
    assert list(fights[0]) == FIGHT_FIELDS and list(fighters[0]) == FIGHTER_FIELDS
    assert len(fights) == 2 and {row["event_date"] for row in fights} == {"2023-05-06"}
    assert {row["method"] for row in fights} == {"U-DEC"} and {row["weight_class"] for row in fights} == {"Lightweight"}
    assert sorted(row["name"] for row in fighters) == ["Ana One", "Bia Two"]
    assert (folder / "rankings.csv").read_text(encoding="utf-8").strip() == ",".join(RANKING_FIELDS)  # header only: ESPN has no rankings
    assert any("/scoreboard" in url for url in fetcher.asked)


def test_a_dry_run_reads_but_writes_nothing(tmp_path, monkeypatch):
    status, _, folder = run(tmp_path, monkeypatch, dry_run=True)
    assert status == 0 and not folder.exists()


def test_a_league_with_no_events_fails_and_leaves_the_files_alone(tmp_path, monkeypatch):
    monkeypatch.setattr(esp, "RAW_DATA_DIR", tmp_path)
    (tmp_path / "ksw").mkdir()
    (tmp_path / "ksw" / "fights.csv").write_text("keep me", encoding="utf-8")

    class Empty(FakeFetcher):
        def get(self, url, params=None, *, optional=False):
            return {"events": []}

    assert esp.collect(esp.League("ksw", "ksw", 2023), Empty(), dry_run=False, photos=False, photo_limit=0, delay=0) == 1
    assert (tmp_path / "ksw" / "fights.csv").read_text(encoding="utf-8") == "keep me"


def test_the_command_line_runs_one_league_or_all_of_them_and_rejects_an_unknown_one(monkeypatch):
    ran = []
    monkeypatch.setattr(esp, "collect", lambda league, fetcher, **options: ran.append(league.id) or 0)
    assert esp.main(["lfa", "--dry-run"]) == 0 and ran == ["lfa"]
    ran.clear()
    assert esp.main(["all", "--dry-run"]) == 0 and ran == ["rizin", "ksw", "lfa", "cage-warriors"]
    with pytest.raises(SystemExit):
        esp.main(["bellator"])  # Bellator has its own collector


def test_one_league_failing_makes_the_command_fail_but_the_others_still_run(monkeypatch):
    ran = []
    monkeypatch.setattr(esp, "collect", lambda league, fetcher, **options: ran.append(league.id) or (1 if league.id == "ksw" else 0))
    assert esp.main(["all", "--dry-run"]) == 1 and ran == ["rizin", "ksw", "lfa", "cage-warriors"]
