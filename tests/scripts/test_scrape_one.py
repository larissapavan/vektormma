"""The ONE scraper: its parsers against small pages that copy the structure of onefc.com, and how it merges them into the file."""

from __future__ import annotations

import json
from datetime import date, timedelta

import pytest

from scripts import scrape_one as one
from scripts.scrape_pfl import FIGHT_FIELDS

BASE = "https://www.onefc.com"


def slug(name: str) -> str:
    return name.lower().replace(" ", "-")


def bout_block(title, a, b, *, winner=None, result=None):
    """One `event-matchup` block, as onefc.com writes it: a badge on the winner's face and the athletes in the `vs` row."""

    def face(index, name):
        badge = '<div class="sticker "></div>'
        if winner == name:
            badge = (
                f'<div class="sticker is-win "><span><em>WIN</em> <span class="opacity-50 d-none d-xxl-inline-block"> {result[0]} </span>'
                f'<span class="opacity-50 d-xxl-none"> {result[1]} </span></span></div>'
            )
        return f'<a class="face face{index}" href="{BASE}/athletes/{slug(name)}/" target="_blank"><div class="ratio ratio-1x1"></div>{badge}</a>'

    return f"""<div class="event-matchup ">
      <div class="title"> {title} </div><div class="versus"> {a} vs. {b} </div>
      {face(1, a)}{face(2, b)}
      <div class="stats"><table><tr class="vs">
        <td><a href="{BASE}/athletes/{slug(a)}/" title="{a}" target="_blank"> {a} </a></td><th> VS </th>
        <td><a href="{BASE}/athletes/{slug(b)}/" title="{b}" target="_blank"> {b} </a></td></tr>
        <tr><td>Brazil</td><th>Country</th><td>Japan</td></tr></table></div></div>"""


def event_page(*, name="ONE Fight Night 49: Gabriel Vs. Magomedov", start="2026-11-07T09:00:00+07:00", venue="Lumpinee Stadium", city="Bangkok", country="TH", bouts=()):
    data = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": name.replace("&", "&amp;"),
        "startDate": start,
        "location": {"@type": "Place", "name": venue, "address": {"@type": "PostalAddress", "addressLocality": city, "addressCountry": country}},
    }
    blocks = "".join(bout_block(*bout[:3], **(bout[3] if len(bout) > 3 else {})) for bout in bouts)
    return f'<html><head><script type="application/ld+json">{json.dumps(data)}</script></head><body><main>{blocks}</main></body></html>'


def stored_row(**values):
    row = {field: "" for field in FIGHT_FIELDS}
    row.update(
        event_name="ONE Fight Night 49", event_date="2026-11-07", location="Lumpinee Boxing Stadium, Bangkok , Thailand",
        event_url="https://en.wikipedia.org/wiki/List_of_ONE_Championship_events#one-fight-night-49", event_slug="one-fight-night-49",
        circuit="ONE Championship", card_order="0", stage="ONE Fight Night 49", title_fight="false", weight_class="Lightweight",
    )
    row.update(values)
    row["fight_url"] = row["fight_url"] or f"{BASE}/events/{row['event_slug']}/#bout-{row['card_order']}"
    for key in ("fighter_1", "fighter_2"):
        row[f"{key}_url"] = row[f"{key}_url"] or f"{BASE}/athletes/{slug(row[key])}/"
    return row


def parse(**kwargs):
    return one.parse_event_page(event_page(**kwargs), f"{BASE}/events/onefightnight49/")


def profiles(*names):
    return one.Profiles([{"name": n, "slug": slug(n), "profile_url": f"{BASE}/athletes/{slug(n)}/"} for n in names])


# --------------------------------------------------------------------------- reading the site


def test_sitemap_entries_carry_their_last_modified_day():
    xml = f"""<urlset>
      <url><loc>{BASE}/events/one-friday-fights-182/</loc><lastmod>2026-10-31T12:20:15+00:00</lastmod></url>
      <url><loc>{BASE}/athletes/someone/</loc><lastmod>2026-10-31T12:20:15+00:00</lastmod></url>
      <url><loc>{BASE}/events/one-samurai-5/</loc><lastmod>2026-10-30T10:08:33+00:00</lastmod></url>
    </urlset>"""
    assert one.parse_sitemap(xml) == [(f"{BASE}/events/one-friday-fights-182/", "2026-10-31"), (f"{BASE}/events/one-samurai-5/", "2026-10-30")]


def test_only_recently_touched_pages_are_opened_newest_first_and_capped(monkeypatch):
    today = date(2026, 11, 1)
    entries = [("old", "2025-01-01"), ("b", "2026-10-30"), ("a", "2026-10-31"), ("blank", ""), ("c", "2026-10-01")]
    assert one.candidate_pages(entries, today) == ["a", "b", "c"]
    monkeypatch.setattr(one, "MAX_EVENT_PAGES", 2)
    assert one.candidate_pages(entries, today) == ["a", "b"]


def test_event_page_gives_name_day_venue_and_every_bout():
    event = parse(
        bouts=[
            ("Lightweight MMA", "Lucas Gabriel", "Magomed Magomedov"),
            ("Strawweight Muay Thai World Championship Unification", "Prajanchai PK Saenchai", "Aliff Sor Dechapan"),
        ]
    )
    assert (event["title"], event["date"], event["venue"], event["city"], event["country_code"]) == ("ONE Fight Night 49", date(2026, 11, 7), "Lumpinee Stadium", "Bangkok", "th")
    assert [b["fighters"] for b in event["bouts"]] == [
        [("lucas-gabriel", "Lucas Gabriel"), ("magomed-magomedov", "Magomed Magomedov")],
        [("prajanchai-pk-saenchai", "Prajanchai PK Saenchai"), ("aliff-sor-dechapan", "Aliff Sor Dechapan")],
    ]
    mma, title = event["bouts"]
    assert (mma["division"], mma["discipline"], mma["title_fight"]) == ("Lightweight", "MMA", False)
    assert (title["division"], title["discipline"], title["title_fight"]) == ("Strawweight", "Muay Thai", True)


def test_a_page_that_is_not_an_event_is_skipped():
    assert one.parse_event_page("<html><body>nothing</body></html>", f"{BASE}/events/x/") is None
    assert one.parse_event_page(event_page(start="not a date"), f"{BASE}/events/x/") is None


@pytest.mark.parametrize(
    "raw, title, slug_",
    [
        ("ONE Fight Night 49: Gabriel Vs. Magomedov", "ONE Fight Night 49", "one-fight-night-49"),
        ("ONE SAMURAI 5", "ONE Samurai 5", "one-samurai-5"),
        ("ONE Friday Fights 182 &amp; The Inner Circle 42", "ONE Friday Fights 182 & The Inner Circle 42", "one-friday-fights-182"),
    ],
)
def test_event_names_and_slugs_follow_the_files_conventions(raw, title, slug_):
    assert one.event_title(raw) == title
    assert one.event_slug_of(title) == slug_


def test_default_stage_is_the_inner_circle_part_when_there_is_one():
    assert one.default_stage("ONE Friday Fights 182 & The Inner Circle 42") == "The Inner Circle 42"
    assert one.default_stage("ONE Samurai 5") == "ONE Samurai 5"


@pytest.mark.parametrize(
    "text, division, womens, discipline, title",
    [
        ("Light Heavyweight MMA", "Light Heavyweight", False, "MMA", False),
        ("Women's Strawweight Kickboxing", "Strawweight", True, "Kickboxing", False),
        ("Atomweight MMA World Championship", "Atomweight", True, "MMA", True),
        ("Flyweight Submission Grappling", "Flyweight", False, "Submission Grappling", False),
    ],
)
def test_a_bout_title_is_split_into_division_discipline_and_title(text, division, womens, discipline, title):
    parsed = one.split_title(text)
    assert (parsed["division"], parsed["womens"], parsed["discipline"], parsed["title_fight"]) == (division, womens, discipline, title)


@pytest.mark.parametrize(
    "shown, expected",
    [
        ("Unanimous Decision (R3)", {"method": "U-DEC", "method_detail": "Unanimous Decision", "round": "3"}),
        ("Split Decision (R5)", {"method": "S-DEC", "method_detail": "Split Decision", "round": "5"}),
        ("Knockout (R2)", {"method": "KO/TKO", "method_detail": "", "round": "2"}),
        ("TKO (R1)", {"method": "KO/TKO", "method_detail": "", "round": "1"}),
        ("Submission (R2)", {"method": "SUB", "method_detail": "", "round": "2"}),
        ("something new (R4)", {"method": "", "method_detail": "", "round": "4"}),
        ("no round here", {}),
    ],
)
def test_the_way_a_bout_ended_is_written_in_the_files_codes(shown, expected):
    assert one.parse_result(shown) == expected


def test_the_winner_and_how_he_won_are_read_from_the_badge():
    event = parse(bouts=[("Heavyweight MMA", "Shamil Erdogan", "Paul Elliott", {"winner": "Shamil Erdogan", "result": ("Submission (R2)", "SUB (R2)")})])
    [bout] = event["bouts"]
    assert bout["winner"] == "shamil-erdogan"
    assert bout["result"] == {"method": "SUB", "method_detail": "", "round": "2"}
    assert parse(bouts=[("Heavyweight MMA", "A One", "B Two")])["bouts"][0]["winner"] == ""


# --------------------------------------------------------------------------- weight classes


def test_the_files_class_names_are_used_not_onefcs():
    assert one.weight_class(one.split_title("Strawweight MMA") | {"fighters": [("a", "A")]}, set()) == "Flyweight"
    assert one.weight_class(one.split_title("Atomweight MMA") | {"fighters": [("a", "A")]}, set()) == "Women's Atomweight"
    assert one.weight_class(one.split_title("Lightweight MMA") | {"fighters": [("a", "A")]}, set()) == "Lightweight"


def test_an_athlete_already_in_a_womens_class_makes_a_strawweight_bout_womens():
    womens = one.womens_names([stored_row(fighter_1="Stamp Fairtex", fighter_2="Someone Else", weight_class="Women's Strawweight")])
    bout = one.split_title("Strawweight MMA") | {"fighters": [("stamp-fairtex", "Stamp Fairtex"), ("other", "Other Woman")]}
    assert one.weight_class(bout, womens) == "Women's Strawweight"


# --------------------------------------------------------------------------- merging into the file


def without_discipline(rows):
    """The rows as they were before the discipline column: what a read must leave exactly as it was."""
    return [{key: value for key, value in row.items() if key != "discipline"} for row in rows]


def merged(rows, event, *names, results=True):
    return one.merge_all(rows, [event] if isinstance(event, dict) else event, profiles(*names), results=results)


def test_a_new_bout_goes_to_the_end_of_its_card_with_the_events_conventions():
    rows = [stored_row(fighter_1="Lucas Gabriel", fighter_2="Magomed Magomedov"), stored_row(fighter_1="Kalandar Tabarov", fighter_2="Ilmadi Israilov", card_order="1")]
    event = parse(bouts=[("Lightweight MMA", "Lucas Gabriel", "Magomed Magomedov"), ("Lightweight Kickboxing", "Bogdan Shumarov", "Gasham Mammadov")])
    result, report = merged(rows, event)
    assert len(result) == 3 and len(report["added"]) == 1
    new = result[-1]
    assert (new["fighter_1"], new["fighter_2"], new["card_order"], new["weight_class"], new["stage"], new["title_fight"]) == (
        "Bogdan Shumarov", "Gasham Mammadov", "2", "Lightweight", "ONE Fight Night 49", "false",
    )
    assert new["fight_url"] == f"{BASE}/events/one-fight-night-49/#bout-2"  # the same base as the event's other rows
    assert new["fighter_1_url"] == f"{BASE}/athletes/bogdan-shumarov/"
    assert (new["event_name"], new["event_slug"], new["location"], new["circuit"]) == ("ONE Fight Night 49", "one-fight-night-49", rows[0]["location"], "ONE Championship")
    assert report["no_profile"] == {"Bogdan Shumarov", "Gasham Mammadov"}


def test_reading_the_same_page_twice_changes_nothing():
    rows = [stored_row(fighter_1="Lucas Gabriel", fighter_2="Magomed Magomedov")]
    event = parse(bouts=[("Lightweight MMA", "Lucas Gabriel", "Magomed Magomedov")])
    once, _ = merged(rows, event)
    twice, report = merged(once, event)
    assert once == twice and without_discipline(once) == without_discipline(rows) and not report["added"] and not report["replaced"]
    assert once[0]["discipline"] == "MMA"  # the only thing a read adds to a bout the file already has


def test_another_spelling_of_the_same_athlete_is_not_a_new_bout_and_keeps_the_stored_name():
    rows = [stored_row(fighter_1="Lee Seung-chul", fighter_2="Nazareth Lalthazuala"), stored_row(fighter_1="Allycia Rodrigues", fighter_2="Charlotte Padie", card_order="1")]
    event = parse(bouts=[("Strawweight MMA", "Lee Seung Cheol", "Nazareth Lalthazuala"), ("Atomweight MMA", "Allycia Hellen Rodrigues", "Charlotte Padie")])
    result, report = merged(rows, event)
    assert without_discipline(result) == without_discipline(rows) and not report["added"] and not report["replaced"]


def test_a_gym_tag_shared_by_two_fighters_does_not_make_them_the_same_person():
    rows = [stored_row(fighter_1="Sitthichai Sor.Dechapan", fighter_2="Arthur Evan")]
    event = parse(bouts=[("Flyweight Muay Thai", "Denchailek Sor.Dechapan", "Adham Ruziev")])
    result, report = merged(rows, event)
    assert len(result) == 2 and len(report["added"]) == 1 and not report["replaced"]


def test_a_changed_opponent_replaces_the_bout_that_has_no_result_yet():
    rows = [stored_row(fighter_1="Lucas Gabriel", fighter_2="Magomed Magomedov")]
    event = parse(bouts=[("Lightweight MMA", "Lucas Gabriel", "Victor Hugo")])
    result, report = merged(rows, event)
    assert len(result) == 1 and (result[0]["fighter_1"], result[0]["fighter_2"]) == ("Lucas Gabriel", "Victor Hugo")
    assert result[0]["fighter_2_url"] == f"{BASE}/athletes/victor-hugo/" and len(report["replaced"]) == 1


def test_a_bout_that_was_fought_is_never_replaced():
    rows = [stored_row(fighter_1="Lucas Gabriel", fighter_2="Magomed Magomedov", winner="Lucas Gabriel", outcome="win")]
    event = parse(bouts=[("Lightweight MMA", "Lucas Gabriel", "Victor Hugo")])
    result, report = merged(rows, event)
    assert result[0]["fighter_2"] == "Magomed Magomedov" and len(result) == 2 and not report["replaced"]


def test_a_stored_bout_missing_from_the_page_is_kept_because_pages_show_partial_cards():
    rows = [stored_row(fighter_1="Lucas Gabriel", fighter_2="Magomed Magomedov"), stored_row(fighter_1="Taiki Naito", fighter_2="Kongthoranee", card_order="1")]
    event = parse(bouts=[("Lightweight MMA", "Lucas Gabriel", "Magomed Magomedov")])
    result, _ = merged(rows, event)
    assert without_discipline(result) == without_discipline(rows)
    assert (result[0]["discipline"], result[1].get("discipline", "")) == ("MMA", "")  # the bout the page does not show is not guessed


def test_results_are_filled_in_but_what_the_file_already_has_is_not_overwritten():
    rows = [
        stored_row(fighter_1="Shamil Erdogan", fighter_2="Paul Elliott"),
        stored_row(fighter_1="Kade Ruotolo", fighter_2="Ok Rae-yoon", card_order="1", winner="Kade Ruotolo", outcome="win", method="SUB", method_detail="Armbar", round="1", time="2:10"),
    ]
    event = parse(
        bouts=[
            ("Heavyweight MMA", "Shamil Erdogan", "Paul Elliott", {"winner": "Shamil Erdogan", "result": ("Submission (R2)", "SUB (R2)")}),
            ("Lightweight MMA", "Kade Ruotolo", "Ok Rae Yoon", {"winner": "Kade Ruotolo", "result": ("Unanimous Decision (R3)", "UD (R3)")}),
        ]
    )
    result, report = merged(rows, event)
    assert (result[0]["winner"], result[0]["outcome"], result[0]["method"], result[0]["round"], result[0]["time"]) == ("Shamil Erdogan", "win", "SUB", "2", "")
    assert (result[1]["method"], result[1]["method_detail"], result[1]["round"], result[1]["time"]) == ("SUB", "Armbar", "1", "2:10")
    assert report["results"] == 1


def test_a_winner_spelled_very_differently_is_found_through_his_opponent():
    rows = [stored_row(fighter_1="Khunsuk T1.FightAcademy", fighter_2="YodUdon K.Tongtalingchan")]
    event = parse(bouts=[("Atomweight Muay Thai", "Khunsuk T1 Fight Academy", "YodUdon K Tongtalingchan", {"winner": "Khunsuk T1 Fight Academy", "result": ("Knockout (R2)", "KO (R2)")})])
    result, report = merged(rows, event)
    assert (result[0]["winner"], result[0]["fighter_1"], result[0]["method"], result[0]["round"]) == ("Khunsuk T1.FightAcademy", "Khunsuk T1.FightAcademy", "KO/TKO", "2")
    assert report["results"] == 1 and not report["added"]


def test_results_can_be_switched_off():
    rows = [stored_row(fighter_1="Shamil Erdogan", fighter_2="Paul Elliott")]
    event = parse(bouts=[("Heavyweight MMA", "Shamil Erdogan", "Paul Elliott", {"winner": "Shamil Erdogan", "result": ("Submission (R2)", "SUB (R2)")})])
    result, report = merged(rows, event, results=False)
    assert result[0]["winner"] == "" and report["results"] == 0


def test_an_event_the_file_does_not_have_is_created_like_the_others():
    rows = [stored_row(event_name="ONE Friday Fights 180 & The Inner Circle 40", event_slug="one-friday-fights-180", event_date="2026-11-27", fighter_1="A One", fighter_2="B Two")]
    event = parse(
        name="ONE Friday Fights 182 & The Inner Circle 42", start="2026-12-11T19:00:00+07:00",
        bouts=[("Flyweight Muay Thai", "Johan Ghazali", "Johan Estupinan"), ("Strawweight Muay Thai World Championship", "Prajanchai PK Saenchai", "Aliff Sor Dechapan")],
    )
    result, report = merged(rows, event)
    new = [row for row in result if row["event_date"] == "2026-12-11"]
    assert [(r["card_order"], r["weight_class"], r["stage"], r["title_fight"]) for r in new] == [("0", "Flyweight", "The Inner Circle 42", "false"), ("1", "Flyweight", "World Title", "true")]
    assert (new[0]["event_name"], new[0]["event_slug"], new[0]["circuit"]) == ("ONE Friday Fights 182 & The Inner Circle 42", "one-friday-fights-182", "ONE Championship")
    assert new[0]["fight_url"] == f"{BASE}/events/onefightnight49/#bout-0" and new[0]["event_url"] == f"{BASE}/events/onefightnight49/"
    assert new[0]["location"] == "Lumpinee Boxing Stadium, Bangkok , Thailand"  # how the file already spells the city
    assert report["events"] == ["2026-12-11 ONE Friday Fights 182 & The Inner Circle 42"]


def test_a_new_event_borrows_the_files_spelling_of_the_city_or_builds_one():
    event = parse(name="ONE Friday Fights 183", start="2026-12-18T19:00:00+07:00", bouts=[("Flyweight Muay Thai", "C Three", "D Four")])
    known = [stored_row(event_date="2026-11-27", event_slug="one-friday-fights-180", event_name="ONE Friday Fights 180", fighter_1="A One", fighter_2="B Two")]
    assert merged(known, event)[0][0]["location"] == "Lumpinee Boxing Stadium, Bangkok , Thailand"

    elsewhere = [stored_row(event_date="2026-11-27", event_slug="one-samurai-5", event_name="ONE Samurai 5", location="Ebara Wave Arena Ota, Tokyo , Japan", fighter_1="A One", fighter_2="B Two")]
    assert merged(elsewhere, event)[0][0]["location"] == "Lumpinee Stadium, Bangkok , Thailand"


def test_an_event_with_no_bouts_yet_is_not_created():
    result, report = merged([], parse(name="ONE Friday Fights 181", bouts=[]))
    assert result == [] and report["events"] == []


def test_the_file_stays_newest_event_first_and_rows_added_by_hand_at_the_end_go_back_to_their_event():
    rows = [
        stored_row(event_date="2026-12-19", event_slug="one-fight-night-50", event_name="ONE Fight Night 50", fighter_1="A One", fighter_2="B Two"),
        stored_row(fighter_1="Lucas Gabriel", fighter_2="Magomed Magomedov"),
        stored_row(event_date="2026-11-01", event_slug="one-fight-night-48", event_name="ONE Fight Night 48", fighter_1="E Five", fighter_2="F Six"),
        stored_row(fighter_1="Late Addition", fighter_2="Other Person", card_order="1"),
    ]
    event = parse(bouts=[("Lightweight MMA", "Lucas Gabriel", "Magomed Magomedov")])
    result, _ = merged(rows, event)
    assert [(r["event_slug"], r["card_order"]) for r in result] == [
        ("one-fight-night-50", "0"), ("one-fight-night-49", "0"), ("one-fight-night-49", "1"), ("one-fight-night-48", "0"),
    ]


def test_two_events_on_the_same_day_are_told_apart_by_their_slug():
    rows = [
        stored_row(event_slug="one-friday-fights-177", event_name="ONE Friday Fights 177", event_date="2026-11-06", fighter_1="A One", fighter_2="B Two"),
        stored_row(event_slug="one-fight-night-49x", event_name="ONE Fight Night 49x", event_date="2026-11-06", fighter_1="C Three", fighter_2="D Four"),
    ]
    event = parse(name="ONE Friday Fights 177", start="2026-11-06T19:00:00+07:00", bouts=[("Flyweight Muay Thai", "A One", "B Two"), ("Flyweight Muay Thai", "G Seven", "H Eight")])
    result, _ = merged(rows, event)
    assert [r["event_slug"] for r in result] == ["one-friday-fights-177", "one-friday-fights-177", "one-fight-night-49x"]


# --------------------------------------------------------------------------- the command


class FakeFetcher:
    pages: dict[str, str] = {}

    def __init__(self, delay=0, cache_dir=None):
        pass

    def get(self, url):
        if url not in self.pages:
            raise RuntimeError(f"{url}: HTTP 404")
        return self.pages[url]


@pytest.fixture
def site(monkeypatch, tmp_path):
    from scripts.scrape_espn import save_csv

    fights = tmp_path / "fights.csv"
    save_csv(fights, FIGHT_FIELDS, [stored_row(event_date=(date.today() + timedelta(days=9)).isoformat(), fighter_1="Lucas Gabriel", fighter_2="Magomed Magomedov")])
    monkeypatch.setattr(one, "FIGHTS_PATH", fights)
    monkeypatch.setattr(one, "FIGHTERS_PATH", tmp_path / "fighters.csv")
    monkeypatch.setattr(one, "Fetcher", FakeFetcher)
    start = (date.today() + timedelta(days=9)).isoformat()
    event_url = f"{BASE}/events/onefightnight49/"
    FakeFetcher.pages = {
        one.SITEMAP_URL: f"<urlset><url><loc>{event_url}</loc><lastmod>{date.today().isoformat()}T10:00:00+00:00</lastmod></url></urlset>",
        event_url: event_page(start=f"{start}T09:00:00+07:00", bouts=[("Lightweight MMA", "Lucas Gabriel", "Magomed Magomedov"), ("Lightweight Kickboxing", "Bogdan Shumarov", "Gasham Mammadov")]),
    }
    return fights


def test_the_command_adds_the_new_bout_to_the_file(site, capsys):
    assert one.main([]) == 0
    from scripts.scrape_espn import load_csv

    _, rows = load_csv(site)
    assert [(r["fighter_1"], r["card_order"]) for r in rows] == [("Lucas Gabriel", "0"), ("Bogdan Shumarov", "1")]
    assert "new bouts: 1" in capsys.readouterr().out


def test_a_dry_run_writes_nothing(site):
    before = site.read_bytes()
    assert one.main(["--dry-run"]) == 0
    assert site.read_bytes() == before


def test_a_site_with_no_readable_events_leaves_the_file_alone_and_fails(site, capsys):
    FakeFetcher.pages = {one.SITEMAP_URL: "<urlset></urlset>"}
    before = site.read_bytes()
    assert one.main([]) == 1
    assert site.read_bytes() == before
    assert "no event found" in capsys.readouterr().out


def test_without_the_history_file_the_command_refuses_to_start(site, monkeypatch, tmp_path):
    monkeypatch.setattr(one, "FIGHTS_PATH", tmp_path / "missing.csv")
    assert one.main([]) == 1


# --------------------------------------------------------------------------- the discipline of a bout


def test_a_new_bout_carries_the_discipline_the_page_names():
    rows = [stored_row(fighter_1="Lucas Gabriel", fighter_2="Magomed Magomedov")]
    event = parse(bouts=[("Lightweight MMA", "Lucas Gabriel", "Magomed Magomedov"), ("Flyweight Muay Thai", "Bogdan Shumarov", "Gasham Mammadov"), ("Atomweight World Title", "A One", "B Two")])
    result, _ = merged(rows, event)
    assert [r["discipline"] for r in result] == ["MMA", "Muay Thai", ""]  # a title that names no sport is left blank, not taken for MMA


def test_a_stored_discipline_is_never_overwritten():
    rows = [stored_row(fighter_1="Lucas Gabriel", fighter_2="Magomed Magomedov", discipline="Kickboxing")]
    event = parse(bouts=[("Lightweight MMA", "Lucas Gabriel", "Magomed Magomedov")])
    result, _ = merged(rows, event)
    assert result[0]["discipline"] == "Kickboxing"


def history_rows():
    return [
        stored_row(fighter_1="Lucas Gabriel", fighter_2="Magomed Magomedov", card_order="0", winner="Lucas Gabriel", outcome="win"),
        stored_row(fighter_1="Bogdan Shumarov", fighter_2="Gasham Mammadov", card_order="1"),
        stored_row(fighter_1="Kalandar Tabarov", fighter_2="Ilmadi Israilov", card_order="2"),
    ]


def test_filling_the_disciplines_changes_only_that_column_and_never_adds_or_removes_a_bout():
    rows = history_rows()
    event = parse(bouts=[
        ("Lightweight MMA", "Lucas Gabriel", "Magomed Magomedov"),
        ("Flyweight Muay Thai", "Gasham Mammadov", "Bogdan Shumarov"),  # corners swapped: still the same bout
        ("Lightweight Kickboxing", "Someone New", "Another New"),  # not in the file: not added
    ])
    result, report = one.fill_disciplines(rows, [event])
    assert [r.get("discipline", "") for r in result] == ["MMA", "Muay Thai", ""]
    assert without_discipline(result) == without_discipline(rows) and len(result) == len(rows)
    assert dict(report["filled"]) == {"MMA": 1, "Muay Thai": 1}


def test_a_bout_that_matches_only_one_athlete_is_left_blank():
    rows = history_rows()
    event = parse(bouts=[("Flyweight Muay Thai", "Bogdan Shumarov", "Somebody Else Entirely")])  # the opponent changed: not safely the same bout
    result, report = one.fill_disciplines(rows, [event])
    assert result[1].get("discipline", "") == "" and report["ambiguous"] == 1


def test_an_event_the_file_does_not_have_is_reported_and_adds_nothing():
    rows = history_rows()
    event = parse(start="2020-01-01T09:00:00+07:00", bouts=[("Flyweight Muay Thai", "Bogdan Shumarov", "Gasham Mammadov")])
    result, report = one.fill_disciplines(rows, [event])
    assert result == [dict(r) for r in rows] and len(report["no_event"]) == 1


def test_a_discipline_already_in_the_file_is_kept_when_filling():
    rows = history_rows()
    rows[1]["discipline"] = "Kickboxing"
    event = parse(bouts=[("Flyweight Muay Thai", "Bogdan Shumarov", "Gasham Mammadov")])
    result, _ = one.fill_disciplines(rows, [event])
    assert result[1]["discipline"] == "Kickboxing"


def test_the_column_is_added_to_a_file_that_does_not_have_it():
    columns, rows = one.with_discipline_column(list(FIGHT_FIELDS), [stored_row()])
    assert columns == [*FIGHT_FIELDS, "discipline"] and rows[0]["discipline"] == ""
    again, _ = one.with_discipline_column(columns, rows)
    assert again == columns  # asked twice, it is still one column


def test_the_command_fills_the_discipline_of_every_stored_bout_and_nothing_else(site):
    from scripts.scrape_espn import load_csv

    _, before = load_csv(site)
    assert one.main(["--disciplines"]) == 0
    header, rows = load_csv(site)
    assert header == [*FIGHT_FIELDS, "discipline"]
    assert [r["discipline"] for r in rows] == ["MMA"]
    assert without_discipline(rows) == without_discipline(before)  # the Kickboxing bout on the page is not in the file, so it is not added


def test_the_disciplines_run_can_be_previewed_and_fails_on_a_site_with_no_readable_events(site):
    before = site.read_bytes()
    assert one.main(["--disciplines", "--dry-run"]) == 0 and site.read_bytes() == before
    FakeFetcher.pages = {one.SITEMAP_URL: "<urlset></urlset>"}
    assert one.main(["--disciplines"]) == 1 and site.read_bytes() == before


def test_a_normal_run_also_adds_the_column_and_the_disciplines_of_new_bouts(site):
    from scripts.scrape_espn import load_csv

    assert one.main([]) == 0
    header, rows = load_csv(site)
    assert header[-1] == "discipline"
    assert [(r["fighter_1"], r["discipline"]) for r in rows] == [("Lucas Gabriel", "MMA"), ("Bogdan Shumarov", "Kickboxing")]


@pytest.mark.parametrize(
    ("title", "discipline"),
    [
        ("Lightweight MMA", "MMA"),
        ("Strawweight Muay Thai World Championship Unification", "Muay Thai"),
        ("140 LBS Muay Thai", "Muay Thai"),  # a weight in pounds instead of a division name
        ("Women's 118 LBS Kickboxing", "Kickboxing"),
        ("Flyweight Submission Grappling", "Submission Grappling"),  # not just "Grappling"
        ("Welterweight Grappling", "Grappling"),
        ("Flyweight muay thai", "Muay Thai"),  # the site's capitals are not relied on
        ("Flyweight World Championship", ""),  # names no sport: left blank, never taken for MMA
        ("Lightweight", ""),
        ("", ""),
    ],
)
def test_the_sport_is_read_from_the_bout_title_wherever_it_stands(title, discipline):
    assert one.discipline_of(title) == discipline
    assert one.split_title(title)["discipline"] == discipline
