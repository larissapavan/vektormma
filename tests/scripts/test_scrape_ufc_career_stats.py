"""The ufc.com career-stats collector: the page parser against a page shaped like the real one, who gets refreshed, and the command."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from scripts import scrape_ufc_career_stats as career
from scripts.scrape_espn import load_csv, save_csv

CAREER_FIELDS = ["fighter_url", "dob", "sig_str_acc", "takedown_acc", "slpm", "sapm", "str_def", "td_avg", "td_def", "sub_avg", "wins", "losses", "draws"]
FIGHTER_FIELDS = ["first_name", "last_name", "nickname", "height", "weight", "reach", "stance", "wins", "losses", "draws", "belt", "fighter_url"]
CARD_FIELDS = ["event_name", "event_date", "fighter_1", "fighter_2", "winner"]
STATS_URL = "http://ufcstats.com/fighter-details/aaaa"
ESPN_URL = "https://www.espn.com/mma/fighter/_/id/123/new-guy"

# slpm, sapm, td_avg, sub_avg, str_def, td_def, knockdown average, average fight time: number first, label after, as on the page
DEFAULT_GROUPS = ["6.29", "6.83", "0.30", "0.00", "51 %", "73 %", "0.67", "12:38"]


def athlete_page(name="Justin Gaethje", circles=("58%", "0%"), groups=DEFAULT_GROUPS):
    chart = "".join(f'<svg class="e-chart-circle"><title>x</title><text class="e-chart-circle__percent">{value}</text></svg>' for value in circles)
    blocks = "".join(
        f'<div class="c-stat-compare__group"><div class="c-stat-compare__number">{value}</div><div class="c-stat-compare__label">Rótulo</div></div>'
        for value in groups
    )
    return f"<html><body><h1>{name}</h1><section>{chart}</section><section>{blocks}</section></body></html>"


def career_row(url=STATS_URL, **values):
    row = {field: "" for field in CAREER_FIELDS}
    row.update(fighter_url=url, dob="Nov 14, 1988", sig_str_acc="57%", takedown_acc="26%", slpm="6.29", sapm="6.83", str_def="50%", td_avg="0.30", td_def="73%", sub_avg="0.0", wins="28", losses="5", draws="0")
    row.update(values)
    return row


def fighter_row(first, last, url=STATS_URL):
    row = {field: "" for field in FIGHTER_FIELDS}
    row.update(first_name=first, last_name=last, fighter_url=url)
    return row


def card_row(day: date, one="Justin Gaethje", two="Dustin Poirier"):
    return {"event_name": "UFC Test", "event_date": day.strftime("%B %d, %Y"), "fighter_1": one, "fighter_2": two, "winner": one}


# --------------------------------------------------------------------------- the page


def test_the_seven_numbers_are_read_by_position_not_by_label():
    assert career.parse_athlete_page(athlete_page(), "Justin Gaethje") == {
        "sig_str_acc": "58%", "str_def": "51%", "td_def": "73%", "slpm": "6.29", "sapm": "6.83", "td_avg": "0.30", "sub_avg": "0.00",
    }


def test_the_first_circle_is_striking_accuracy_and_the_takedown_one_is_ignored():
    stats = career.parse_athlete_page(athlete_page(circles=("44%", "88%")), "Justin Gaethje")
    assert stats["sig_str_acc"] == "44%" and "takedown_acc" not in stats


def test_a_page_for_someone_else_is_refused():
    assert career.parse_athlete_page(athlete_page(name="Jon Jones"), "Justin Gaethje") is None
    assert career.parse_athlete_page("<html><body><p>no heading</p></body></html>", "Justin Gaethje") is None


def test_a_name_with_accents_matches_the_plain_spelling():
    assert career.parse_athlete_page(athlete_page(name="Jiří Procházka"), "Jiri Prochazka") is not None


@pytest.mark.parametrize(
    "page",
    [
        athlete_page(groups=DEFAULT_GROUPS[:5]),  # a layout with fewer blocks than expected
        athlete_page(circles=()),  # no accuracy circles: a fighter with no UFC fight yet
        athlete_page(groups=["60.00"] + DEFAULT_GROUPS[1:]),  # 60 strikes a minute: read wrongly
        athlete_page(groups=DEFAULT_GROUPS[:4] + ["150 %"] + DEFAULT_GROUPS[5:]),  # a percentage above 100
        athlete_page(groups=["n/a"] + DEFAULT_GROUPS[1:]),
    ],
)
def test_a_page_that_does_not_look_right_is_skipped_instead_of_guessed(page):
    assert career.parse_athlete_page(page, "Justin Gaethje") is None


def test_a_comma_decimal_is_read():
    stats = career.parse_athlete_page(athlete_page(groups=["6,29"] + DEFAULT_GROUPS[1:]), "Justin Gaethje")
    assert stats["slpm"] == "6.29"


# --------------------------------------------------------------------------- the row


def test_update_row_changes_only_the_seven_numbers_and_keeps_everything_else():
    row = career_row()
    stats = career.parse_athlete_page(athlete_page(circles=("58%", "0%")), "Justin Gaethje")
    assert career.update_row(row, stats) is True
    assert (row["sig_str_acc"], row["str_def"]) == ("58%", "51%")
    assert row["sub_avg"] == "0.0"  # 0.0 and 0.00 are the same number: the file's own spelling stays
    assert (row["takedown_acc"], row["dob"], row["wins"], row["losses"], row["draws"]) == ("26%", "Nov 14, 1988", "28", "5", "0")  # untouched


def test_the_same_number_in_another_format_is_not_a_change():
    row = career_row(sig_str_acc="58%", str_def="51%", sub_avg="0.0", td_avg="0.3")
    stats = career.parse_athlete_page(athlete_page(), "Justin Gaethje")
    assert career.update_row(row, stats) is False
    assert (row["sub_avg"], row["td_avg"]) == ("0.0", "0.3")  # the file's own spelling stays


# --------------------------------------------------------------------------- who is refreshed


def test_recent_fighters_are_the_ones_on_a_card_inside_the_window_with_their_latest_day():
    today = date.today()
    cards = [
        card_row(today - timedelta(days=3), "Ana Silva", "Bia Costa"),
        card_row(today - timedelta(days=20), "Ana Silva", "Caio Dias"),
        card_row(today - timedelta(days=90), "Old Timer", "Other Old"),
    ]
    recent = career.recent_fighters(cards, today - timedelta(days=30))
    assert set(recent) == {career.name_key(n) for n in ("Ana Silva", "Bia Costa", "Caio Dias")}
    assert recent[career.name_key("Ana Silva")] == today - timedelta(days=3)
    assert career.name_key("Old Timer") not in recent


def test_targets_are_the_most_recent_first_then_fighters_without_ufcstats_numbers_and_capped():
    today = date.today()
    fighters = [
        fighter_row("Old", "Fighter", "http://ufcstats.com/fighter-details/1"),
        fighter_row("Ana", "Silva", "http://ufcstats.com/fighter-details/2"),
        fighter_row("Bia", "Costa", "http://ufcstats.com/fighter-details/3"),
        fighter_row("New", "Guy", ESPN_URL),
    ]
    recent = {career.name_key("Ana Silva"): today - timedelta(days=10), career.name_key("Bia Costa"): today - timedelta(days=2)}
    assert [name for name, _ in career.pick_targets(fighters, recent, 10)] == ["Bia Costa", "Ana Silva", "New Guy"]
    assert [name for name, _ in career.pick_targets(fighters, recent, 2)] == ["Bia Costa", "Ana Silva"]


def test_a_fighter_is_listed_once_even_if_two_rows_share_the_url():
    fighters = [fighter_row("New", "Guy", ESPN_URL), fighter_row("New", "Guy", ESPN_URL)]
    assert len(career.pick_targets(fighters, {}, 10)) == 1


# --------------------------------------------------------------------------- the command


class FakeThrottle:
    pages: dict[str, str | None] = {}
    requested: list[str] = []

    def __init__(self, delay=0):
        pass

    def get(self, url):
        FakeThrottle.requested.append(url)
        return FakeThrottle.pages.get(url)


@pytest.fixture
def raw(monkeypatch, tmp_path):
    save_csv(tmp_path / "fighters.csv", FIGHTER_FIELDS, [fighter_row("Justin", "Gaethje"), fighter_row("Idle", "Man", "http://ufcstats.com/fighter-details/9")])
    save_csv(tmp_path / "fighter_career_stats.csv", CAREER_FIELDS, [career_row(), career_row("http://ufcstats.com/fighter-details/9", slpm="1.00")])
    save_csv(tmp_path / "event_cards.csv", CARD_FIELDS, [card_row(date.today() - timedelta(days=2))])
    monkeypatch.setattr(career, "FIGHTERS_PATH", tmp_path / "fighters.csv")
    monkeypatch.setattr(career, "CAREER_PATH", tmp_path / "fighter_career_stats.csv")
    monkeypatch.setattr(career, "CARDS_PATH", tmp_path / "event_cards.csv")
    monkeypatch.setattr(career, "Throttle", FakeThrottle)
    FakeThrottle.requested = []
    FakeThrottle.pages = {"https://www.ufc.com/athlete/justin-gaethje": athlete_page()}
    return tmp_path / "fighter_career_stats.csv"


def test_the_command_updates_the_row_of_a_recent_fighter_and_leaves_the_others(raw, capsys):
    assert career.main([]) == 0
    rows = {r["fighter_url"]: r for r in load_csv(raw)[1]}
    assert rows[STATS_URL]["sig_str_acc"] == "58%" and rows[STATS_URL]["takedown_acc"] == "26%"
    assert rows["http://ufcstats.com/fighter-details/9"]["slpm"] == "1.00"
    assert FakeThrottle.requested == ["https://www.ufc.com/athlete/justin-gaethje"]  # the idle fighter was never requested
    assert "updated: 1" in capsys.readouterr().out


def test_a_dry_run_writes_nothing(raw):
    before = raw.read_bytes()
    assert career.main(["--dry-run"]) == 0
    assert raw.read_bytes() == before


def test_a_fighter_with_no_page_is_skipped_without_failing_the_run_when_another_one_is_read(raw, monkeypatch, tmp_path, capsys):
    save_csv(tmp_path / "fighters.csv", FIGHTER_FIELDS, [fighter_row("Justin", "Gaethje"), fighter_row("Ghost", "Fighter", ESPN_URL)])
    save_csv(tmp_path / "fighter_career_stats.csv", CAREER_FIELDS, [career_row(), career_row(ESPN_URL)])
    assert career.main([]) == 0
    assert "skipped: 1" in capsys.readouterr().out


def test_when_no_page_can_be_read_the_file_is_left_alone_and_the_run_fails(raw):
    FakeThrottle.pages = {}
    before = raw.read_bytes()
    assert career.main([]) == 1
    assert raw.read_bytes() == before


def test_nothing_to_refresh_is_not_a_failure(raw, monkeypatch, tmp_path):
    save_csv(tmp_path / "event_cards.csv", CARD_FIELDS, [card_row(date.today() - timedelta(days=200))])
    assert career.main([]) == 0
    assert FakeThrottle.requested == []


def test_the_limit_caps_how_many_pages_are_read(raw, tmp_path):
    save_csv(tmp_path / "fighters.csv", FIGHTER_FIELDS, [fighter_row("Justin", "Gaethje"), fighter_row("Dustin", "Poirier", "http://ufcstats.com/fighter-details/7")])
    save_csv(tmp_path / "fighter_career_stats.csv", CAREER_FIELDS, [career_row(), career_row("http://ufcstats.com/fighter-details/7")])
    FakeThrottle.pages = {"https://www.ufc.com/athlete/justin-gaethje": athlete_page(), "https://www.ufc.com/athlete/dustin-poirier": athlete_page(name="Dustin Poirier")}
    assert career.main(["--limit", "1"]) == 0
    assert len(FakeThrottle.requested) == 1
