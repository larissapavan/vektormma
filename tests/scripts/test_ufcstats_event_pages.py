"""The two UFCStats event pages the scripts read, copied down to the parts the parsers use."""

from __future__ import annotations

from bs4 import BeautifulSoup

from scripts.scrape_event_cards import parse_event_card
from scripts.scrape_upcoming_events import list_upcoming_events

UPCOMING = """
<table><tbody>
<tr class="b-statistics__table-row"><td></td></tr>
<tr class="b-statistics__table-row">
  <td><i><a class="b-link b-link_style_black" href="http://ufcstats.com/event-details/abc">UFC 330: Alpha vs. Beta</a>
  <span class="b-statistics__date">November 14, 2026</span></i></td>
  <td>Las Vegas, Nevada, USA</td>
</tr>
<tr class="b-statistics__table-row">
  <td><i><a class="b-link b-link_style_black" href="http://ufcstats.com/event-details/def">UFC Fight Night: Gamma vs. Delta</a></i></td>
</tr>
</tbody></table>
"""


def _fight_row(link, first, second, winner_flag, weight, method, detail, round_, time):
    flag = '<a class="b-flag b-flag_style_green"><i class="b-flag__text">win</i></a>' if winner_flag else ""
    return f"""
    <tr class="b-fight-details__table-row js-fight-details-click" data-link="{link}">
      <td>{flag}</td>
      <td><p>{first}</p><p>{second}</p></td>
      <td></td><td></td><td></td><td></td>
      <td><p>{weight}</p></td>
      <td><p>{method}</p><p>{detail}</p></td>
      <td><p>{round_}</p></td>
      <td><p>{time}</p></td>
    </tr>"""


def _event_page(rows, date="November 14, 2026", location="Las Vegas, Nevada, USA"):
    return f"""
    <ul>
      <li class="b-list__box-list-item"><i>Date:</i> {date}</li>
      <li class="b-list__box-list-item"><i>Location:</i> {location}</li>
    </ul>
    <table><tbody>{rows}</tbody></table>"""


def test_the_upcoming_list_keeps_only_rows_with_a_name_and_a_date():
    events = list_upcoming_events(BeautifulSoup(UPCOMING, "html.parser"))
    assert events == [("UFC 330: Alpha vs. Beta", "November 14, 2026", "http://ufcstats.com/event-details/abc")]


def test_an_empty_page_has_no_upcoming_events():
    assert list_upcoming_events(BeautifulSoup("<html></html>", "html.parser")) == []


def test_a_card_reads_both_fighters_the_winner_the_method_and_the_clock():
    page = _event_page(
        _fight_row("http://ufcstats.com/fight-details/1", "Alpha One", "Beta Two", True, "Lightweight", "KO/TKO", "Punches", "2", "3:41")
        + _fight_row("http://ufcstats.com/fight-details/2", "Gamma Three", "Delta Four", False, "Flyweight", "Decision - Unanimous", "", "3", "5:00")
    )
    fights = parse_event_card(BeautifulSoup(page, "html.parser"), "UFC 330", "ignored", "http://ufcstats.com/event-details/abc")
    assert len(fights) == 2
    first, second = fights
    assert (first["fighter_1"], first["fighter_2"], first["winner"]) == ("Alpha One", "Beta Two", "Alpha One")
    assert (first["method"], first["method_detail"], first["round"], first["time"]) == ("KO/TKO", "Punches", "2", "3:41")
    assert first["weight_class"] == "Lightweight" and first["fight_url"].endswith("/fight-details/1")
    # No green flag on the first name: a draw, a no contest or a win for the second fighter. The card does not say which.
    assert second["winner"] is None and second["method_detail"] is None and second["weight_class"] == "Flyweight"


def test_the_date_and_place_come_from_the_event_page_not_from_the_list():
    """events.csv has a few rows whose date is a place name; the page's own date wins."""
    page = _event_page(_fight_row("u", "A One", "B Two", True, "Lightweight", "SUB", "Armbar", "1", "1:00"), date="March 2, 2024", location="Perth, Australia")
    fight = parse_event_card(BeautifulSoup(page, "html.parser"), "UFC 999", "Perth, Australia", "http://x")[0]
    assert fight["event_date"] == "March 2, 2024" and fight["location"] == "Perth, Australia"


def test_without_date_and_place_the_given_date_is_kept():
    page = f"<table><tbody>{_fight_row('u', 'A One', 'B Two', False, 'Lightweight', 'KO/TKO', 'x', '1', '0:30')}</tbody></table>"
    fight = parse_event_card(BeautifulSoup(page, "html.parser"), "UFC 1", "March 2, 2024", "http://x")[0]
    assert fight["event_date"] == "March 2, 2024" and fight["location"] is None


def test_rows_that_are_too_short_or_have_one_name_are_skipped():
    short = '<tr class="b-fight-details__table-row js-fight-details-click"><td>x</td></tr>'
    one_name = _fight_row("u", "Only One", "", True, "Lightweight", "KO/TKO", "x", "1", "1:00").replace("<p></p>", "")
    assert parse_event_card(BeautifulSoup(_event_page(short + one_name), "html.parser"), "E", "d", "u") == []
