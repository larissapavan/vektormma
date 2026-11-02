"""The Sherdog collector (Jungle Fight, Invicta FC), run against pages that copy the shape of Sherdog's event pages."""

from __future__ import annotations

import csv
from datetime import date

import pytest

from backend.app.services.org_service import ORGS as SITE_ORGS
from scripts import scrape_sherdog_org as sd
from scripts.scrape_pfl import FIGHT_FIELDS, FIGHTER_FIELDS, RANKING_FIELDS

JUNGLE, INVICTA = sd.ORGS["jungle-fight"], sd.ORGS["invicta"]


def fighter_block(side, name, ident, result, nickname=None):
    first, _, last = name.partition(" ")
    alt = f"{first} '{nickname}' {last}" if nickname else name
    outcome = f'<span class="final_result {result}">{result}</span>' if result else ""
    return (
        f'<div class="fighter {side}_side"><a href="/fighter/{name.replace(" ", "-")}-{ident}"><img alt="{alt}" src="/x.png"/></a>'
        f'<h3><a href="/fighter/{name.replace(" ", "-")}-{ident}"><span itemprop="name">{first}<br/>{last}</span></a></h3>'
        f'<span class="record">8-1-0</span>{outcome}</div>'
    )


def table_fighter(side, name, ident, result, nickname=None):
    first, _, last = name.partition(" ")
    alt = f"{first} '{nickname}' {last}" if nickname else name
    outcome = f'<br/><span class="final_result {result}">{result}</span>' if result else ""
    return (
        f'<div class="fighter_list {side}"><img alt="{alt}" src="/y.png"/><div class="fighter_result_data">'
        f'<a href="/fighter/{name.replace(" ", "-")}-{ident}"><span itemprop="name">{first}<br/>{last}</span></a>{outcome}</div></div>'
    )


def row(number, left, right, *, weight="Lightweight", title=False, method="Decision (Unanimous)", round_="3", time="5:00"):
    flag = '<span class="title_fight">TITLE FIGHT</span>' if title else ""
    return (
        f'<tr itemprop="subEvent"><td><meta content="x" itemprop="name"/>{number}</td>'
        f'<td class="text_right" itemprop="performer">{table_fighter("left", *left)}</td>'
        f'<td class="text_center">{flag}<br/><span class="weight_class">{weight}</span></td>'
        f'<td class="text_left" itemprop="performer">{table_fighter("right", *right)}</td>'
        f'<td class="winby"><b>{method}</b><br/><span class="sub_line"><a href="/referee/Ref-1">Ref Eree</a></span></td><td>{round_}</td><td>{time}</td></tr>'
    )


ANA, BIA, CAL, DAN, EVA, FAY = (("Ana One", 1, "win"), ("Bia Two", 2, "loss"), ("Cal Three", 3, "win"), ("Dan Four", 4, "loss"), ("Eva Five", 5, "win"), ("Fay Six", 6, "loss"))


def page(*rows, org="Jungle Fight", day="2024-03-16", title="Jungle Fight 99", main=None, location="Arena, Manaus, Amazonas, Brazil"):
    main_html = ""
    if main:
        (lname, lid, lres), (rname, rid, rres), weight, belt, method, rnd, clock = main
        flag = '<span class="title_fight">TITLE FIGHT</span>' if belt else ""
        main_html = (
            f'<div class="fight_card">{fighter_block("left", lname, lid, lres)}<div class="versus"><b>MAIN EVENT</b>{flag}<br/>'
            f'<span class="weight_class">{weight}</span></div>{fighter_block("right", rname, rid, rres)}</div>'
            f'<table class="fight_card_resume"><tr><td><em>Match</em><br/>14</td><td><em>Method</em><br/>{method}</td>'
            f'<td><em>Referee</em><br/><a href="/referee/R-1">R</a></td><td><em>Round</em><br/>{rnd}</td><td><em>Time</em><br/>{clock}</td></tr></table>'
        )
    table = f'<table class="new_table result"><tr><th>Match</th></tr>{"".join(rows)}</table>' if rows else ""
    return (
        f'<html><body><div class="event_detail"><div><h1><span itemprop="name">{title}</span></h1>'
        f'<div class="organization"><a href="/organizations/X-1"><span itemprop="name">{org}</span></a></div>'
        f'<div class="info"><span><meta content="{day}T00:00:00+00:00" itemprop="startDate"/>Mar 16, 2024</span>'
        f'<span><span itemprop="location">{location}</span></span></div></div></div>{main_html}{table}</body></html>'
    )


URL = "https://www.sherdog.com/events/Jungle-Fight-99-Test-5"


def test_each_organization_is_registered_on_the_site_with_the_folder_it_writes_to():
    for org in sd.ORGS.values():
        assert org.id in SITE_ORGS and SITE_ORGS[org.id].data_dir.name == org.id


def test_the_events_of_an_organization_are_the_sitemap_addresses_that_start_with_its_prefix():
    xml = """<urlset>
      <url><loc>https://www.sherdog.com/events/Jungle-Fight-1-Manaus-1812</loc></url>
      <url><loc>https://www.sherdog.com/events/Jungle-Fight-1-Manaus-1812</loc></url>
      <url><loc>https://www.sherdog.com/events/UFC-1-The-Beginning-7</loc></url>
      <url><loc>https://www.sherdog.com/events/Invicta-FC-1-Coenen-vs-Ruyssen-20545</loc></url>
    </urlset>"""
    assert sd.event_urls(xml, "Jungle-Fight") == ["https://www.sherdog.com/events/Jungle-Fight-1-Manaus-1812"]
    assert sd.event_urls(xml, "Invicta") == ["https://www.sherdog.com/events/Invicta-FC-1-Coenen-vs-Ruyssen-20545"]


def test_an_event_has_its_name_date_place_and_the_main_event_first():
    html = page(row(13, CAL, DAN), main=(ANA, BIA, "Strawweight", True, "TKO (Doctor Stoppage)", "4", "5:00"))
    event = sd.parse_event(html, URL, JUNGLE)
    assert (event["name"], event["day"], event["location"], event["id"]) == ("Jungle Fight 99", date(2024, 3, 16), "Arena, Manaus, Amazonas, Brazil", "5")
    main, other = event["bouts"]
    assert (main["fighter_1"]["name"], main["fighter_2"]["name"], main["winner"], main["weight_class"], main["title_fight"]) == ("Ana One", "Bia Two", "Ana One", "Strawweight", True)
    assert (main["method"], main["method_detail"], main["round"], main["time"]) == ("KO/TKO", "Doctor Stoppage", "4", "5:00")
    assert (other["winner"], other["title_fight"]) == ("Cal Three", False)


def test_the_table_rows_give_winner_division_method_round_and_time():
    event = sd.parse_event(page(row(2, CAL, DAN, weight="Welterweight", method="Submission (Rear-Naked Choke)", round_="2", time="0:30"), row(1, EVA, FAY)), URL, JUNGLE)
    first, second = event["bouts"]
    assert (first["winner"], first["weight_class"], first["method"], first["method_detail"], first["round"], first["time"]) == ("Cal Three", "Welterweight", "SUB", "Rear-Naked Choke", "2", "0:30")
    assert (second["method"], second["method_detail"]) == ("U-DEC", "")  # a decision says which one, not a technique


@pytest.mark.parametrize(
    ("text", "code"),
    [
        ("Decision (Unanimous)", "U-DEC"), ("Decision (Split)", "S-DEC"), ("Decision (Majority)", "M-DEC"), ("Decision", "DEC"),
        ("KO (Punches)", "KO/TKO"), ("TKO (Doctor Stoppage)", "KO/TKO"), ("Submission (Armbar)", "SUB"), ("DQ (Illegal Knee)", "DQ"),
    ],
)
def test_the_method_is_written_like_the_ufc_data(text, code):
    assert sd.method_of(text)[0] == code


def test_a_card_with_draws_and_no_contests_marks_them_the_way_the_fighter_history_counts_them():
    drawn = (("Ana One", 1, "draw"), ("Bia Two", 2, "draw"))
    voided = (("Cal Three", 3, "nc"), ("Dan Four", 4, "nc"))
    event = sd.parse_event(page(row(2, *drawn, method="Decision (Majority)"), row(1, *voided, method="NC (Accidental Eye Poke)")), URL, JUNGLE)
    draw, no_contest = event["bouts"]
    assert (draw["outcome"], draw["method"], draw["winner"]) == ("draw", "Draw", "")
    assert (no_contest["outcome"], no_contest["method"], no_contest["winner"]) == ("no_contest", "NO CONTEST", "")


def test_a_card_to_come_has_no_results():
    to_come = (("Ana One", 1, ""), ("Bia Two", 2, ""))
    event = sd.parse_event(page(row(1, *to_come, method="", round_="", time="")), URL, JUNGLE)
    [bout] = event["bouts"]
    assert (bout["outcome"], bout["winner"], bout["method"], bout["round"], bout["time"]) == ("", "", "", "", "")


def test_another_promoters_event_or_a_page_without_a_card_is_not_taken():
    assert sd.parse_event(page(row(1, ANA, BIA), org="Invicta Fighting Championships"), URL, JUNGLE) is None
    assert sd.parse_event(page(row(1, ANA, BIA), org="Jungle Fight 2"), URL, JUNGLE) is None
    assert sd.parse_event(page(), URL, JUNGLE) is None
    assert sd.parse_event("<html>nothing</html>", URL, JUNGLE) is None


@pytest.mark.parametrize(
    ("label", "womens", "expected"),
    [
        ("Lightweight", False, "Lightweight"), ("Catchweight", False, "Catch Weight"), ("150lb Catchweight", False, "Catch Weight"),
        ("Strawweight", False, "Strawweight"), ("Bantamweight", True, "Women's Bantamweight"), ("Catchweight", True, "Catch Weight"), ("", False, ""),
    ],
)
def test_the_division_is_the_ufc_name_and_an_all_women_promotion_says_so(label, womens, expected):
    assert sd.division(label, womens) == expected


def test_invicta_is_marked_as_a_womens_promotion_and_jungle_fight_is_not():
    assert INVICTA.womens and not JUNGLE.womens
    event = sd.parse_event(page(row(1, ANA, BIA, weight="Bantamweight"), org="Invicta Fighting Championships"), URL, INVICTA)
    assert event["bouts"][0]["weight_class"] == "Women's Bantamweight"


def test_rows_name_the_organization_flag_the_title_bout_and_keep_card_order():
    event = sd.parse_event(page(row(1, CAL, DAN), main=(ANA, BIA, "Strawweight", True, "KO (Punch)", "1", "0:10")), URL, JUNGLE)
    rows = sd.fight_rows([event], JUNGLE)
    assert [r["card_order"] for r in rows] == [0, 1] and [r["fighter_1"] for r in rows] == ["Ana One", "Cal Three"]
    assert (rows[0]["title_fight"], rows[0]["stage"], rows[1]["title_fight"]) == ("true", "Title Fight", "")
    assert all(r["event_slug"] == "jungle-fight-5" and r["event_url"] == URL for r in rows)
    assert rows[0]["fighter_1_url"] == "https://www.sherdog.com/fighter/Ana-One-1"


def test_fighters_have_a_profile_nickname_usual_division_and_only_the_dates_of_fights_had():
    old = sd.parse_event(page(row(1, (("Ana One", 1, "win")), BIA, weight="Lightweight"), day="2019-01-01"), URL, JUNGLE)
    old["id"] = "1"
    new_row = row(1, (("Ana One", 1, "", "The Arm")), (("Cal Three", 3, "")), weight="Lightweight", method="", round_="", time="")
    coming = sd.parse_event(page(new_row, day="2099-01-01"), URL, JUNGLE)
    recent = sd.parse_event(page(row(1, (("Dan Four", 4, "win")), (("Eva Five", 5, "loss")), weight="Welterweight"), day="2026-06-01"), URL, JUNGLE)
    events = [coming, recent, old]
    fights = sd.fight_rows(events, JUNGLE)
    rows = {r["name"]: r for r in sd.fighter_rows(events, fights, date(2026, 11, 2))}
    ana = rows["Ana One"]
    assert (ana["profile_url"], ana["nickname"], ana["weight_class"], ana["first_fight_date"], ana["last_fight_date"]) == ("https://www.sherdog.com/fighter/Ana-One-1", "The Arm", "Lightweight", "2019-01-01", "2019-01-01")
    assert ana["country"] == "" and ana["career_record"] == "" and ana["age"] == ""  # not on the event page: nothing is guessed
    assert (ana["status"], rows["Dan Four"]["status"], rows["Cal Three"]["status"]) == ("inactive", "active", "inactive")


class FakeFetcher:
    def __init__(self, pages):
        self.pages = pages

    def get(self, url):
        return self.pages.get(url)


def sitemap(*slugs):
    return "<urlset>" + "".join(f"<url><loc>https://www.sherdog.com/events/{slug}</loc></url>" for slug in slugs) + "</urlset>"


def read(path):
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def test_a_run_writes_the_three_files_and_skips_what_is_not_the_organizations(tmp_path, monkeypatch):
    monkeypatch.setattr(sd, "RAW_DATA_DIR", tmp_path)
    pages = {
        "https://www.sherdog.com/events/Jungle-Fight-1-A-1": page(row(1, ANA, BIA), day="2010-01-01"),
        "https://www.sherdog.com/events/Jungle-Fight-2-B-2": page(row(1, CAL, DAN), day="2011-01-01"),
        "https://www.sherdog.com/events/Jungle-Fight-Korea-3": page(row(1, EVA, FAY), org="Some Korean Promoter"),
    }
    sitemaps = [sitemap("Jungle-Fight-1-A-1", "Jungle-Fight-2-B-2", "Jungle-Fight-Korea-3")]
    assert sd.collect(JUNGLE, FakeFetcher(pages), sitemaps, dry_run=False) == 0
    folder = tmp_path / "jungle-fight"
    fights, fighters = read(folder / "fights.csv"), read(folder / "fighters.csv")
    assert list(fights[0]) == FIGHT_FIELDS and list(fighters[0]) == FIGHTER_FIELDS
    assert [r["event_date"] for r in fights] == ["2011-01-01", "2010-01-01"]  # newest first; the Korean promoter's event is not here
    assert sorted(r["name"] for r in fighters) == ["Ana One", "Bia Two", "Cal Three", "Dan Four"]
    assert (folder / "rankings.csv").read_text(encoding="utf-8").strip() == ",".join(RANKING_FIELDS)


def test_a_dry_run_writes_nothing_and_no_events_is_an_error_that_leaves_the_files_alone(tmp_path, monkeypatch):
    monkeypatch.setattr(sd, "RAW_DATA_DIR", tmp_path)
    pages = {"https://www.sherdog.com/events/Jungle-Fight-1-A-1": page(row(1, ANA, BIA))}
    assert sd.collect(JUNGLE, FakeFetcher(pages), [sitemap("Jungle-Fight-1-A-1")], dry_run=True) == 0 and not (tmp_path / "jungle-fight").exists()
    (tmp_path / "jungle-fight").mkdir()
    (tmp_path / "jungle-fight" / "fights.csv").write_text("keep me", encoding="utf-8")
    assert sd.collect(JUNGLE, FakeFetcher({}), [sitemap("Jungle-Fight-1-A-1")], dry_run=False) == 1
    assert (tmp_path / "jungle-fight" / "fights.csv").read_text(encoding="utf-8") == "keep me"


def test_the_command_line_takes_one_organization_or_all_and_fails_if_the_sitemaps_cannot_be_read(monkeypatch):
    ran = []
    monkeypatch.setattr(sd, "Fetcher", lambda delay, cache_dir, user_agent: FakeFetcher({url: "<urlset></urlset>" for url in sd.SITEMAPS}))
    monkeypatch.setattr(sd, "collect", lambda org, fetcher, sitemaps, dry_run: ran.append(org.id) or 0)
    assert sd.main(["invicta", "--dry-run"]) == 0 and ran == ["invicta"]
    ran.clear()
    assert sd.main(["all", "--dry-run"]) == 0 and ran == ["jungle-fight", "invicta"]
    monkeypatch.setattr(sd, "Fetcher", lambda delay, cache_dir, user_agent: FakeFetcher({}))
    assert sd.main(["all", "--dry-run"]) == 1
    with pytest.raises(SystemExit):
        sd.main(["ksw"])
