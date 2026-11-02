"""The career timeline: the cache's whole career with the UFC fights as the UFC history records them."""

from __future__ import annotations

import pytest

from backend.app.services.fight_history_service import _merge_career_timeline as merge


def cached(date, opponent, *, ufc=True, **extra):
    return {"event_name": "Cached", "date": date, "opponent": opponent, "result": "win", "is_ufc": ufc, "organization": "UFC" if ufc else "Other FC", "notes": "kept", **extra}


def official(date, opponent, **extra):
    return {"event_name": "UFC 1", "date": date, "opponent": opponent, "result": "win", "winner": "Me", "referee": "Ref Eree", "num_rounds": 5, "fight_url": "https://x/1", "title_fight": True, "interim_title": False, "interim_title_win": False, **extra}


def test_a_ufc_fight_takes_the_details_of_the_ufc_history_and_keeps_what_only_the_cache_knows():
    [fight] = merge([official("2024-01-01", "Jan Blachowicz")], [cached("2024-01-01", "Jan Błachowicz")])
    assert (fight["winner"], fight["referee"], fight["num_rounds"], fight["fight_url"], fight["title_fight"]) == ("Me", "Ref Eree", 5, "https://x/1", True)
    assert fight["opponent"] == "Jan Blachowicz" and fight["event_name"] == "UFC 1"  # the history's spelling wins, as it did before the cache
    assert (fight["notes"], fight["is_ufc"], fight["organization"]) == ("kept", True, "UFC")


@pytest.mark.parametrize("cache_day", ["2024-01-01", "2024-01-02", "2023-12-31"])
def test_the_day_may_differ_by_one_but_not_more(cache_day):
    [fight] = merge([official("2024-01-01", "Someone Else")], [cached(cache_day, "Name Spelled Differently")])
    assert fight["winner"] == "Me"  # one card, matched by the day: a name spelled another way does not matter


def test_two_days_apart_is_another_fight_so_both_are_kept():
    timeline = merge([official("2024-01-01", "A")], [cached("2024-01-03", "B")])
    assert [(f["date"], f.get("winner")) for f in timeline] == [("2024-01-01", "Me"), ("2024-01-03", None)]


def test_other_organizations_are_untouched_even_on_the_day_of_a_ufc_fight():
    other = cached("2024-01-01", "Somebody", ufc=False)
    timeline = merge([official("2024-01-01", "A")], [other])
    assert other in timeline and len(timeline) == 2  # the history's fight is added; the other organization's one is not taken for it
    assert next(f for f in timeline if not f["is_ufc"]) == other


def test_a_fight_only_the_history_has_is_added_and_one_only_the_cache_has_is_kept():
    timeline = merge(
        [official("2026-10-31", "Newer"), official("2020-01-01", "Both")],
        [cached("2020-01-01", "Both"), cached("2017-07-18", "Early Fight Not In The Cards")],
    )
    assert [(f["date"], f["opponent"]) for f in timeline] == [("2017-07-18", "Early Fight Not In The Cards"), ("2020-01-01", "Both"), ("2026-10-31", "Newer")]
    assert [f.get("winner") for f in timeline] == [None, "Me", "Me"]  # the early cached fight has no detail to take


def test_each_history_fight_is_used_once_and_the_closest_day_wins():
    timeline = merge([official("2024-01-01", "A"), official("2024-01-02", "B")], [cached("2024-01-02", "B"), cached("2024-01-01", "A")])
    assert [(f["date"], f["opponent"]) for f in timeline] == [("2024-01-01", "A"), ("2024-01-02", "B")]
    assert all(f["winner"] == "Me" for f in timeline) and len(timeline) == 2  # no fight twice, none lost


def test_a_value_the_history_does_not_have_does_not_blank_the_one_the_cache_has():
    [fight] = merge([official("2024-01-01", "A", method=None, location=None)], [cached("2024-01-01", "A", method="Decision (unanimous)", location="Las Vegas")])
    assert (fight["method"], fight["location"]) == ("Decision (unanimous)", "Las Vegas")


def test_the_timeline_is_oldest_first_and_an_empty_history_leaves_the_cache_as_it_is():
    timeline = merge([], [cached("2010-05-01", "A", ufc=False), cached("2012-05-01", "B")])
    assert [f["date"] for f in timeline] == ["2010-05-01", "2012-05-01"] and timeline[1]["organization"] == "UFC"
    assert merge([official("2024-01-01", "A")], []) == [{**official("2024-01-01", "A"), "is_ufc": True, "organization": "UFC"}]
