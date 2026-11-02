"""The OKTAGON collector, run against pages that copy the shape of oktagonmma.com's server-rendered event pages."""

from __future__ import annotations

import csv
import json
from datetime import date

import pytest

from backend.app.services.org_service import ORGS
from scripts import scrape_oktagon as okt
from scripts.scrape_pfl import FIGHT_FIELDS, FIGHTER_FIELDS, RANKING_FIELDS


def fighter(slug, first, last, *, wins=10, losses=2, weight="Welterweight", gender="MALE", champion=False, nationality="CZ"):
    return {
        "id": abs(hash(slug)) % 10000, "slug": slug, "firstName": first, "lastName": last, "nickName": "",
        "weightClass": {"title": weight, "gender": gender}, "scores": {"MMA_PROFI": {"wins": wins, "losses": losses, "draws": 0, "noContests": 0}},
        "heightCm": 182, "nationality": nationality, "champion": champion,
        "imageProfile": {"url": {"cs": f"https://assets.example/{slug}.png"}},
    }


def bout(one, two, *, result="FIGHTER_1_WIN", kind="DEC", time="5:00", rounds=3, title=False, weight="Welterweight", gender="MALE"):
    return {
        "id": hash((one["slug"], two["slug"])) % 100000, "titleFight": title, "result": result, "resultType": kind, "time": time, "numRounds": rounds,
        "fighter1": one, "fighter2": two, "weightClass": {"title": weight, "gender": gender},
    }


ANA, BIA, CAL, DAN = fighter("ana-one", "Ána", "One"), fighter("bia-two", "Bia", "Two"), fighter("cal-three", "Cal", "Three"), fighter("dan-four", "Dan", "Four")


def page(*bouts, slug="oktagon-1", org="OKTAGON_MMA", start="2024-03-16T18:00:00.000Z", country="CZ", title="OKTAGON 1: A VS. B"):
    detail = {
        "id": 7, "state": "ACTIVE", "slug": slug, "startDate": start, "organizationId": org, "title": {"cs": title},
        "location": {"city": {"cs": "Ostrava"}, "country": country},
    }
    queries = [
        {"queryKey": ["events", "detail", slug, {}], "state": {"data": detail}},
        {"queryKey": ["events", "fightCard", 7], "state": {"data": [{"id": 1, "title": {"cs": "main"}, "fights": list(bouts)}]}},
        {"queryKey": ["news", "list", {}], "state": {"data": {"pages": []}}},
    ]
    data = {"props": {"pageProps": {"dehydratedState": {"queries": queries}}}}
    return f'<html><body><script id="__NEXT_DATA__" type="application/json">{json.dumps(data)}</script></body></html>'


def test_it_is_a_registered_organisation_with_the_data_folder_it_writes_to():
    assert "oktagon" in ORGS and ORGS["oktagon"].data_dir == okt.OUTPUT_DIR


def test_the_event_pages_are_the_english_ones_of_the_sitemap_each_once():
    xml = """<urlset>
      <url><loc>https://oktagonmma.com/cs/events/oktagon-11/</loc></url>
      <url><loc>https://oktagonmma.com/en/events/oktagon-11/</loc></url>
      <url><loc>https://oktagonmma.com/en/events/oktagon-11/</loc></url>
      <url><loc>https://oktagonmma.com/en/events/oktagon-12/</loc></url>
      <url><loc>https://oktagonmma.com/en/events/oktagon-12/weigh-in/</loc></url>
    </urlset>"""
    assert okt.event_slugs(xml) == ["oktagon-11", "oktagon-12"]


def test_an_event_has_its_name_date_place_and_bouts_with_the_main_event_first():
    event = okt.parse_event(page(bout(ANA, BIA), bout(CAL, DAN, result="FIGHTER_2_WIN", kind="KO", time="2:10", rounds=1)), "oktagon-1")
    assert (event["name"], event["location"], event["day"]) == ("OKTAGON 1: A VS. B", "Ostrava, Czech Republic", date(2024, 3, 16))
    assert [full for full in (okt.full_name(b["fighter1"]) for b in event["bouts"])] == ["Ana One", "Cal Three"]
    assert okt.full_name(event["bouts"][0]["fighter1"]) == "Ana One"  # accents folded, like every other organization


def test_a_late_card_keeps_its_local_date():
    event = okt.parse_event(page(bout(ANA, BIA), start="2024-03-16T23:30:00.000Z"), "oktagon-1")
    assert event["day"] == date(2024, 3, 17)  # 00:30 in Prague, the day after the UTC one


def test_events_of_other_promotions_and_pages_without_a_card_are_skipped():
    assert okt.parse_event(page(bout(ANA, BIA), org="PML"), "pml-8") is None
    assert okt.parse_event(page(), "oktagon-time") is None
    assert okt.parse_event("<html>no data</html>", "x") is None
    assert okt.parse_event(page(bout(fighter("tba", "", ""), BIA)), "oktagon-1") is None  # a bout with an unnamed fighter is not listed


@pytest.mark.parametrize("weight", ["Muaythai 75kg", "K1 95kg", "Women's Muaythai", "63kg Muaythai", "Lightweight Amateur", "Amateur Bout Middleweight"])
def test_muay_thai_k1_and_amateur_bouts_are_not_mma_data(weight):
    event = okt.parse_event(page(bout(ANA, BIA), bout(CAL, DAN, weight=weight)), "oktagon-1")
    assert len(event["bouts"]) == 1


@pytest.mark.parametrize(
    ("title", "gender", "expected"),
    [
        ("Welterweight", "MALE", "Welterweight"),
        ("Light heavyweight", "MALE", "Light Heavyweight"),
        ("Heavyweight", "MALE", "Heavyweight"),
        ("Bantamweight", "FEMALE", "Women's Bantamweight"),
        ("Catchweight 80kg", "MALE", "Catch Weight"),
        ("Cathweight 68kg", "MALE", "Catch Weight"),  # the site's own typo
        ("Women's Catchweight 60kg", "FEMALE", "Catch Weight"),
        ("Light Heavyweight 93kg Stand And Bang Rules", "MALE", "Light Heavyweight"),
        ("Super Middleweight", "MALE", "Super Middleweight"),
        ("85 Kg", "MALE", ""),  # names no division: left empty, not guessed
        ("Mma", "MALE", ""),
        ("Oktagon Challenge", "MALE", ""),
        ("", "MALE", ""),
    ],
)
def test_the_weight_class_is_one_of_the_divisions_the_ufc_data_uses(title, gender, expected):
    assert okt.division({"title": title, "gender": gender}) == expected


def rows_of(*bouts, **extra):
    event = okt.parse_event(page(*bouts, **extra), "oktagon-1")
    return okt.fight_rows([event]), event


def test_results_use_the_ufc_vocabulary_and_a_bout_to_come_has_none():
    rows, _ = rows_of(
        bout(ANA, BIA, kind="DEC"),
        bout(CAL, DAN, result="FIGHTER_2_WIN", kind="TKO_DOC", time="1:05", rounds=2),
        bout(ANA, DAN, result=None, kind=None, time=None, rounds=None),
        bout(BIA, CAL, result="DRAW", kind="DEC"),
        bout(BIA, DAN, result="NO_CONTEST", kind=None, time="0:30", rounds=1),
    )
    decision, stoppage, to_come, draw, no_contest = rows
    assert (decision["winner"], decision["method"], decision["round"], decision["time"], decision["outcome"]) == ("Ana One", "DEC", "3", "5:00", "win")
    assert (stoppage["winner"], stoppage["method"], stoppage["method_detail"], stoppage["round"]) == ("Dan Four", "KO/TKO", "Doctor's Stoppage", "2")
    assert (to_come["winner"], to_come["outcome"], to_come["method"], to_come["round"], to_come["time"]) == ("", "", "", "", "")
    assert (draw["outcome"], draw["method"], draw["winner"]) == ("draw", "Draw", "")  # the fighter history counts these by the method text
    assert (no_contest["outcome"], no_contest["method"]) == ("no_contest", "NO CONTEST")


def test_a_title_bout_is_flagged_and_the_ids_name_the_organisation():
    rows, event = rows_of(bout(ANA, BIA, title=True), bout(CAL, DAN))
    assert (rows[0]["title_fight"], rows[0]["stage"], rows[1]["title_fight"]) == ("true", "Title Fight", "")
    assert all(row["event_slug"] == "oktagon-oktagon-1" and row["event_url"] == "https://oktagonmma.com/en/events/oktagon-1/" for row in rows)
    assert rows[0]["fighter_1_url"] == "https://oktagonmma.com/en/fighters/ana-one/"


def test_a_winner_without_a_method_keeps_the_win_and_leaves_the_method_empty():
    rows, _ = rows_of(bout(ANA, BIA, kind=None))
    assert (rows[0]["outcome"], rows[0]["winner"], rows[0]["method"]) == ("win", "Ana One", "")


def test_fighters_have_the_record_country_and_dates_of_the_bouts_they_fought_not_those_to_come():
    fought = okt.parse_event(page(bout(ANA, BIA)), "oktagon-1")
    coming = okt.parse_event(page(bout(ANA, CAL, result=None, kind=None, time=None, rounds=None), slug="oktagon-2", start="2099-01-01T18:00:00.000Z"), "oktagon-2")
    events = [coming, fought]  # newest first, as the script sorts them
    fights = okt.fight_rows(events)
    rows = {row["name"]: row for row in okt.fighter_rows(events, fights, date(2026, 11, 2))}
    ana = rows["Ana One"]
    assert (ana["career_record"], ana["wins"], ana["losses"], ana["country"], ana["country_code"], ana["height_cm"]) == ("10-2-0", 10, 2, "Czech Republic", "cz", 182)
    assert (ana["first_fight_date"], ana["last_fight_date"]) == ("2024-03-16", "2024-03-16")  # the 2099 bout is not a fight yet
    assert ana["age"] == "" and ana["camp"] == ""  # the site gives neither: nothing is guessed
    assert rows["Cal Three"]["last_fight_date"] == "" and rows["Cal Three"]["status"] == "inactive"


def test_a_fighter_is_active_when_they_fought_in_the_last_two_years_or_hold_a_belt():
    old = okt.parse_event(page(bout(ANA, BIA), start="2019-01-01T18:00:00.000Z"), "oktagon-1")
    recent = okt.parse_event(page(bout(CAL, DAN), slug="oktagon-2", start="2026-06-01T18:00:00.000Z"), "oktagon-2")
    champion = okt.parse_event(page(bout(fighter("old-champ", "Old", "Champ", champion=True), ANA), slug="oktagon-3", start="2019-02-01T18:00:00.000Z"), "oktagon-3")
    events = [recent, champion, old]
    rows = {row["name"]: row["status"] for row in okt.fighter_rows(events, okt.fight_rows(events), date(2026, 11, 2))}
    assert rows == {"Cal Three": "active", "Dan Four": "active", "Old Champ": "active", "Ana One": "inactive", "Bia Two": "inactive"}


class FakeFetcher:
    def __init__(self, pages):
        self.pages = pages

    def get(self, url):
        return self.pages.get(url)


def run(tmp_path, monkeypatch, pages, *, dry_run=False):
    monkeypatch.setattr(okt, "OUTPUT_DIR", tmp_path / "oktagon")
    monkeypatch.setattr(okt, "Fetcher", lambda delay, cache_dir: FakeFetcher(pages))
    return okt.main(["--dry-run"] if dry_run else [])


SITEMAP = "<urlset>" + "".join(f"<url><loc>https://oktagonmma.com/en/events/{slug}/</loc></url>" for slug in ("oktagon-1", "oktagon-2", "pml-1")) + "</urlset>"


def pages_for_run():
    return {
        okt.SITEMAP_URL: SITEMAP,
        okt.EVENT_URL.format(slug="oktagon-1"): page(bout(ANA, BIA), bout(CAL, DAN, result="FIGHTER_2_WIN", kind="SUB", rounds=2, time="3:00")),
        okt.EVENT_URL.format(slug="oktagon-2"): page(bout(ANA, CAL), slug="oktagon-2", start="2025-01-01T18:00:00.000Z"),
        okt.EVENT_URL.format(slug="pml-1"): page(bout(ANA, DAN), slug="pml-1", org="PML"),
    }


def read(path):
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def test_a_run_writes_the_three_files_with_only_oktagon_events(tmp_path, monkeypatch):
    assert run(tmp_path, monkeypatch, pages_for_run()) == 0
    folder = tmp_path / "oktagon"
    fights, fighters = read(folder / "fights.csv"), read(folder / "fighters.csv")
    assert list(fights[0]) == FIGHT_FIELDS and list(fighters[0]) == FIGHTER_FIELDS
    assert {row["event_slug"] for row in fights} == {"oktagon-oktagon-1", "oktagon-oktagon-2"}  # not the PML card
    assert [row["event_date"] for row in fights][0] == "2025-01-01"  # newest event first
    assert (folder / "rankings.csv").read_text(encoding="utf-8").strip() == ",".join(RANKING_FIELDS)


def test_a_dry_run_writes_nothing_and_an_empty_sitemap_is_an_error(tmp_path, monkeypatch):
    assert run(tmp_path, monkeypatch, pages_for_run(), dry_run=True) == 0 and not (tmp_path / "oktagon").exists()
    assert run(tmp_path, monkeypatch, {okt.SITEMAP_URL: "<urlset></urlset>"}) == 1
    assert run(tmp_path, monkeypatch, {okt.SITEMAP_URL: SITEMAP}) == 1  # events listed but none has a card
    assert not (tmp_path / "oktagon").exists()


def run_main(tmp_path, monkeypatch, pages):
    monkeypatch.setattr(okt, "OUTPUT_DIR", tmp_path / "oktagon")
    monkeypatch.setattr(okt, "Fetcher", lambda delay, cache_dir: FakeFetcher(pages))
    return okt.main([])


def test_a_day_with_no_change_leaves_the_files_byte_for_byte_as_they_were(tmp_path, monkeypatch):
    assert run_main(tmp_path, monkeypatch, pages_for_run()) == 0
    folder = tmp_path / "oktagon"
    # pretend the first run was long ago: every fighter was checked on an old day
    text = (folder / "fighters.csv").read_text(encoding="utf-8")
    old = text.replace(date.today().isoformat(), "2020-01-01")
    assert old != text
    (folder / "fighters.csv").write_text(old, encoding="utf-8", newline="")
    before = {name: (folder / name).read_bytes() for name in ("fights.csv", "fighters.csv", "rankings.csv")}
    assert run_main(tmp_path, monkeypatch, pages_for_run()) == 0
    assert {name: (folder / name).read_bytes() for name in before} == before  # the same site: the same files, `checked` days included


def test_only_the_fighter_who_changed_gets_a_new_checked_day(tmp_path, monkeypatch):
    assert run_main(tmp_path, monkeypatch, pages_for_run()) == 0
    folder = tmp_path / "oktagon"
    (folder / "fighters.csv").write_text((folder / "fighters.csv").read_text(encoding="utf-8").replace(date.today().isoformat(), "2020-01-01"), encoding="utf-8", newline="")
    changed = pages_for_run()
    stronger = fighter("ana-one", "Ána", "One", wins=11)  # one more win on the site, on the newest card she is on
    changed[okt.EVENT_URL.format(slug="oktagon-2")] = page(bout(stronger, CAL), slug="oktagon-2", start="2025-01-01T18:00:00.000Z")
    assert run_main(tmp_path, monkeypatch, changed) == 0
    rows = {r["name"]: r for r in read(folder / "fighters.csv")}
    assert rows["Ana One"]["wins"] == "11" and rows["Ana One"]["checked"] == date.today().isoformat()
    assert rows["Bia Two"]["checked"] == "2020-01-01" and rows["Cal Three"]["checked"] == "2020-01-01"


def test_a_read_that_would_shrink_the_files_is_refused_and_leaves_them_alone(tmp_path, monkeypatch, capsys):
    assert run_main(tmp_path, monkeypatch, pages_for_run()) == 0
    folder = tmp_path / "oktagon"
    before = {name: (folder / name).read_bytes() for name in ("fights.csv", "fighters.csv")}
    pages = pages_for_run()
    pages[okt.EVENT_URL.format(slug="oktagon-1")] = page(bout(ANA, BIA))  # the site now shows one bout where it showed two
    pages.pop(okt.EVENT_URL.format(slug="oktagon-2"))  # and an event is gone
    assert run_main(tmp_path, monkeypatch, pages) == 1
    assert {name: (folder / name).read_bytes() for name in before} == before and "shrink" in capsys.readouterr().out
