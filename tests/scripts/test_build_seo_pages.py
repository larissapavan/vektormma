"""Which fighters the static roster of an organization lists first."""

from __future__ import annotations

from scripts.build_seo_pages import _busiest


def fighter(name, wins, total, org_fights):
    return {"name": name, "wins": wins, "total_fights": total, "org_fights": org_fights}


def test_the_career_record_decides_where_most_fighters_have_one():
    pool = [fighter("Ana", 5, 8, 8), fighter("Bia", 30, 41, 2), fighter("Cris", None, None, 9)]
    assert [f["name"] for f in _busiest(pool)] == ["Bia", "Ana", "Cris"]


def test_the_bouts_in_the_organization_decide_where_most_have_no_record():
    pool = [fighter("Ana", None, None, 3), fighter("Bia", 343, 398, 9), fighter("Cris", None, None, 21)]
    assert [f["name"] for f in _busiest(pool)] == ["Cris", "Bia", "Ana"]
