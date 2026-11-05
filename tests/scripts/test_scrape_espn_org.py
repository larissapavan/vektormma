"""The ESPN collector for RIZIN, KSW, LFA and Cage Warriors, run against small answers that copy the shape of ESPN's."""

from __future__ import annotations

import csv
from datetime import date, timedelta

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
    assert esp.main(["all", "--dry-run"]) == 0 and ran == ["lfa", "cage-warriors"]  # RIZIN and KSW are frozen: Sherdog continues them
    with pytest.raises(SystemExit):
        esp.main(["bellator"])  # Bellator has its own collector


def test_one_league_failing_makes_the_command_fail_but_the_others_still_run(monkeypatch):
    ran = []
    monkeypatch.setattr(esp, "collect", lambda league, fetcher, **options: ran.append(league.id) or (1 if league.id == "ksw" else 0))
    monkeypatch.setattr(esp, "collect", lambda league, fetcher, **options: ran.append(league.id) or (1 if league.id == "lfa" else 0))
    assert esp.main(["all", "--dry-run"]) == 1 and ran == ["lfa", "cage-warriors"]


def test_rizin_and_ksw_are_frozen_a_full_run_needs_to_be_asked_for_twice_and_the_daily_refresh_leaves_them_alone(monkeypatch, capsys):
    ran = []
    monkeypatch.setattr(esp, "collect", lambda league, fetcher, **options: ran.append(("full", league.id)) or 0)
    monkeypatch.setattr(esp, "collect_recent", lambda league, fetcher, **options: ran.append(("recent", league.id)) or 0)
    assert esp.main(["ksw"]) == 1 and ran == [] and "frozen" in capsys.readouterr().out  # a full run would drop what Sherdog added
    assert esp.main(["rizin", "--recent-days", "45"]) == 0 and ran == []
    assert esp.main(["ksw", "--rewrite-frozen"]) == 0 and ran == [("full", "ksw")]
    ran.clear()
    assert esp.main(["all", "--recent-days"]) == 0 and ran == [("recent", "lfa"), ("recent", "cage-warriors")]  # the default window


# --------------------------------------------------------------------------- the daily refresh (LFA, Cage Warriors)

TODAY = date.today()


def days_ago(count):
    return (TODAY - timedelta(days=count)).isoformat()


def card(event_id, day, *bouts, name="LFA 200"):
    """The events of a scoreboard answer for one card on `day` (18:00 UTC: the same day everywhere)."""
    payload = {"events": [{"id": event_id, "name": name, "date": f"{day}T18:00Z", "venues": [], "competitions": list(bouts)}]}
    return esp.parse_events(payload, LFA)


def stored_bout(event_id, day, one, two, *, winner="", division="Lightweight", order=0, method=""):
    row = {field: "" for field in FIGHT_FIELDS}
    row.update(
        event_name=f"LFA {event_id}", event_date=day, location="Phoenix, AZ, USA", event_url=f"https://www.espn.com/{event_id}", event_slug=f"lfa-{event_id}",
        fight_url=f"https://www.espn.com/{event_id}#fight-{order}", card_order=str(order), fighter_1=one, fighter_2=two,
        fighter_1_url=f"https://www.espn.com/mma/fighter/_/id/{one[:2]}", fighter_2_url=f"https://www.espn.com/mma/fighter/_/id/{two[:2]}",
        winner=winner, outcome="win" if winner else "", weight_class=division, method=method,
    )
    return row


def stored_person(name, **values):
    row = {field: "" for field in FIGHTER_FIELDS}
    row.update(name=name, slug=name.lower().replace(" ", "-"), profile_url=f"https://www.espn.com/mma/fighter/_/id/{name[:2]}", status="inactive", country="United States")
    row.update(values)
    return row


BIO = {"nickname": "", "age": 30, "height_cm": 180.0, "weight_lbs": 155, "reach_cm": "", "country": "United States", "country_code": "us", "camp": "New Gym", "fighting_out_of": "", "weight_class": "Lightweight", "headshot_url": "", "active": True}


def test_a_refresh_puts_the_events_read_in_place_of_the_stored_ones_and_leaves_every_other_row_alone():
    old_day, recent_day = days_ago(300), days_ago(10)
    stored = [stored_bout("2", recent_day, "Ana One", "Bia Two", order=0), stored_bout("1", old_day, "Cal Three", "Dan Four", winner="Cal Three", method="SUB")]
    keep = [dict(row) for row in stored[1:]]
    events = card("2", recent_day, competition("1", [competitor("a", "Ana One", 1, winner=True), competitor("b", "Bia Two", 2)], period=2, clock="1:00"))  # the result came in
    fighters = {"a": {"id": "a", "name": "Ana One", "flag": "USA", "record": "11-2-0"}, "b": {"id": "b", "name": "Bia Two", "flag": "USA", "record": "5-6-0"}}
    combined, people, report = esp.refresh_rows(LFA, events, {"1": ("KO/TKO", "Punches")}, {"a": BIO, "b": BIO}, fighters, stored, [stored_person("Ana One", slug="ana-one", image_url="/fighter-photos/lfa/ana-one.webp")], TODAY)
    assert [row["event_slug"] for row in combined] == ["lfa-2", "lfa-1"]  # newest first
    assert combined[1] == keep[0]  # the old card, untouched
    assert (combined[0]["winner"], combined[0]["method"], combined[0]["round"]) == ("Ana One", "KO/TKO", "2")  # the stored bout without a result now has one
    assert len([row for row in combined if row["event_slug"] == "lfa-2"]) == 1  # replaced, not repeated
    assert report == {"new": 1, "updated": 1, "kept": 0}
    ana = next(row for row in people if row["name"] == "Ana One")
    assert (ana["slug"], ana["image_url"], ana["career_record"], ana["last_fight_date"]) == ("ana-one", "/fighter-photos/lfa/ana-one.webp", "11-2-0", recent_day)  # same slug and photo, fresh numbers


def test_a_refresh_keeps_the_bouts_sherdog_added_to_a_card_unless_espn_now_has_the_same_bout():
    day = days_ago(10)
    sherdog_only = stored_bout("2", day, "Cal Three", "Dan Four", order=0)
    sherdog_only["fight_url"] = "https://www.sherdog.com/events/LFA-200-X-9#fight-0"  # a bout ESPN does not list
    sherdog_twin = stored_bout("2", day, "Eva Five", "Fay Six", order=2)
    sherdog_twin["fight_url"] = "https://www.sherdog.com/events/LFA-200-X-9#fight-2"  # a bout ESPN lists now
    stored = [sherdog_only, stored_bout("2", day, "Ana One", "Bia Two", order=1), sherdog_twin, stored_bout("1", days_ago(300), "Gil Eight", "Hal Nine")]
    events = card(
        "2", day,
        competition("1", [competitor("a", "Ana One", 1, winner=True), competitor("b", "Bia Two", 2)], period=2, clock="1:00"),
        competition("2", [competitor("e", "Eva Five", 5, winner=True), competitor("f", "Fay Six", 6)], period=1, clock="2:00"),
    )
    fighters = {key: {"id": key, "name": name, "flag": "USA", "record": ""} for key, name in (("a", "Ana One"), ("b", "Bia Two"), ("e", "Eva Five"), ("f", "Fay Six"))}
    combined, _, _ = esp.refresh_rows(LFA, events, {"1": ("KO/TKO", ""), "2": ("SUB", "")}, {key: BIO for key in fighters}, fighters, stored, [], TODAY)
    card_rows = [row for row in combined if row["event_slug"] == "lfa-2"]
    assert sorted(row["fighter_1"] for row in card_rows) == ["Ana One", "Cal Three", "Eva Five"]  # Sherdog's Cal v Dan stays; Eva v Fay is ESPN's now, once
    assert [row["fight_url"].startswith("https://www.sherdog.com") for row in sorted(card_rows, key=lambda row: row["fighter_1"])] == [False, True, False]
    assert [row for row in combined if row["event_slug"] == "lfa-1"] == [stored[3]]  # another card: untouched


def test_a_card_still_to_come_is_listed_but_is_not_a_fight_the_fighter_has_had():
    soon = (TODAY + timedelta(days=20)).isoformat()
    events = card("9", soon, competition("1", [competitor("a", "Ana One", 1), competitor("b", "Bia Two", 2)], completed=False))
    fighters = {"a": {"id": "a", "name": "Ana One", "flag": "USA", "record": "11-2-0"}, "b": {"id": "b", "name": "Bia Two", "flag": "USA", "record": ""}}
    stored = [stored_bout("1", days_ago(100), "Ana One", "Cal Three", winner="Ana One")]
    combined, people, _ = esp.refresh_rows(LFA, events, {}, {"a": BIO, "b": BIO}, fighters, stored, [stored_person("Ana One")], TODAY)
    assert [row["outcome"] for row in combined] == ["", "win"]
    by_name = {row["name"]: row for row in people}
    assert by_name["Ana One"]["last_fight_date"] == days_ago(100)  # not the date of the card to come
    assert by_name["Bia Two"]["last_fight_date"] == ""


def test_a_fighter_whose_profile_could_not_be_read_keeps_the_stored_row_and_only_gets_new_dates():
    day = days_ago(5)
    events = card("2", day, competition("1", [competitor("a", "Ana One", 1, winner=True), competitor("b", "Bia Two", 2)]))
    fighters = {"a": {"id": "a", "name": "Ana One", "flag": "", "record": ""}, "b": {"id": "b", "name": "Bia Two", "flag": "", "record": ""}}
    stored_ana = stored_person("Ana One", height_cm="177.8", camp="Old Gym", career_record="10-2-0", last_fight_date=days_ago(90))
    _, people, report = esp.refresh_rows(LFA, events, {"1": ("U-DEC", "")}, {"a": {}, "b": BIO}, fighters, [], [stored_ana], TODAY)  # ESPN gave no profile for Ana
    ana = next(row for row in people if row["name"] == "Ana One")
    assert (ana["height_cm"], ana["camp"], ana["career_record"], ana["last_fight_date"]) == ("177.8", "Old Gym", "10-2-0", day)
    assert report["kept"] == 1 and report["new"] == 1


def test_a_new_fighter_gets_a_slug_that_is_not_taken_and_old_blank_divisions_are_not_filled_in_after_the_fact():
    day = days_ago(5)
    events = card("2", day, competition("1", [competitor("a", "Ana One", 1, winner=True), competitor("b", "Ana-One", 2)]))  # the same slug
    fighters = {"a": {"id": "a", "name": "Ana One", "flag": "", "record": ""}, "b": {"id": "b", "name": "Ana-One", "flag": "", "record": ""}}
    blank_old = stored_bout("1", days_ago(200), "Ana One", "Cal Three", division="")
    combined, people, _ = esp.refresh_rows(LFA, events, {"1": ("DEC", "")}, {"a": BIO, "b": BIO}, fighters, [blank_old], [stored_person("Cal Three")], TODAY)
    assert len({row["slug"] for row in people}) == len(people)
    assert next(row for row in combined if row["event_slug"] == "lfa-1")["weight_class"] == ""  # history is not rewritten


class RecentFetcher:
    """ESPN for one league whose newest card is ten days old; remembers what was asked."""

    failures = 0

    def __init__(self, on=None):
        self.asked = []
        self.on = on or days_ago(10)

    def get(self, url, params=None, *, optional=False):
        self.asked.append(url)
        if "/scoreboard" in url:
            year = int(params["dates"][:4])
            return {"events": [{"id": "5", "name": "LFA 5", "date": f"{self.on}T18:00Z", "venues": [], "competitions": [competition("1", [competitor("a", "Ana One", 1, winner=True), competitor("b", "Bia Two", 2)])]}]} if year == int(self.on[:4]) else {"events": []}
        if url.endswith("/status?lang=en"):
            return {"result": {"displayName": "Decision - Unanimous"}}
        return {"nickname": "", "age": 30, "height": 70.0, "weight": 155.0, "citizenship": "USA", "active": True, "weightClass": {"text": "Lightweight"}}


def seed(tmp_path, monkeypatch, fights, fighters):
    from scripts.scrape_espn import save_csv

    monkeypatch.setattr(esp, "RAW_DATA_DIR", tmp_path)
    folder = tmp_path / "lfa"
    folder.mkdir()
    save_csv(folder / "fights.csv", FIGHT_FIELDS, fights)
    save_csv(folder / "fighters.csv", FIGHTER_FIELDS, fighters)
    return folder


def test_the_daily_refresh_reads_only_the_recent_window_and_writes_the_merged_files(tmp_path, monkeypatch):
    folder = seed(tmp_path, monkeypatch, [stored_bout("1", days_ago(400), "Cal Three", "Dan Four", winner="Cal Three")], [stored_person("Cal Three"), stored_person("Dan Four")])
    fetcher = RecentFetcher()
    assert esp.collect_recent(LFA, fetcher, recent_days=45, dry_run=False) == 0
    fights, people = read(folder / "fights.csv"), read(folder / "fighters.csv")
    assert [row["event_slug"] for row in fights] == ["lfa-5", "lfa-1"] and fights[0]["winner"] == "Ana One" and fights[0]["method"] == "U-DEC"
    assert {row["name"] for row in people} == {"Ana One", "Bia Two", "Cal Three", "Dan Four"}
    assert len([url for url in fetcher.asked if "/scoreboard" in url]) <= 3  # this year, the next one, and last year at most: not the whole history
    assert read(folder / "fighters.csv") and not (folder / "rankings.csv").exists()  # the rankings file is not this refresh's


def test_a_second_refresh_changes_nothing_and_a_dry_run_writes_nothing(tmp_path, monkeypatch):
    folder = seed(tmp_path, monkeypatch, [stored_bout("1", days_ago(400), "Cal Three", "Dan Four", winner="Cal Three")], [stored_person("Cal Three")])
    before = (folder / "fights.csv").read_bytes()
    assert esp.collect_recent(LFA, RecentFetcher(), recent_days=45, dry_run=True) == 0 and (folder / "fights.csv").read_bytes() == before
    assert esp.collect_recent(LFA, RecentFetcher(), recent_days=45, dry_run=False) == 0
    once = ((folder / "fights.csv").read_bytes(), (folder / "fighters.csv").read_bytes())
    assert esp.collect_recent(LFA, RecentFetcher(), recent_days=45, dry_run=False) == 0
    assert ((folder / "fights.csv").read_bytes(), (folder / "fighters.csv").read_bytes()) == once


def test_a_quiet_window_is_not_an_error_and_a_missing_file_is(tmp_path, monkeypatch, capsys):
    folder = seed(tmp_path, monkeypatch, [stored_bout("1", days_ago(400), "Cal Three", "Dan Four", winner="Cal Three")], [stored_person("Cal Three")])
    before = (folder / "fights.csv").read_bytes()
    assert esp.collect_recent(LFA, RecentFetcher(on=days_ago(200)), recent_days=45, dry_run=False) == 0  # the newest card is older than the window
    assert (folder / "fights.csv").read_bytes() == before and "nothing to update" in capsys.readouterr().out
    (folder / "fights.csv").unlink()
    assert esp.collect_recent(LFA, RecentFetcher(), recent_days=45, dry_run=False) == 1


def test_a_refresh_that_would_lose_rows_is_refused_and_leaves_the_files_alone(tmp_path, monkeypatch, capsys):
    # A recent card of 60 bouts that ESPN now answers with one bout: replacing it would drop 59 rows (more than 2%).
    stored = [stored_bout("5", days_ago(10), "Cal Three", "Dan Four", winner="Cal Three", order=n) for n in range(60)] + [stored_bout("1", days_ago(400), "Eva Five", "Fay Six", winner="Eva Five")]
    folder = seed(tmp_path, monkeypatch, stored, [stored_person("Cal Three")])
    before = (folder / "fights.csv").read_bytes(), (folder / "fighters.csv").read_bytes()
    assert esp.collect_recent(LFA, RecentFetcher(), recent_days=45, dry_run=False) == 1
    assert ((folder / "fights.csv").read_bytes(), (folder / "fighters.csv").read_bytes()) == before and "would drop rows" in capsys.readouterr().out
