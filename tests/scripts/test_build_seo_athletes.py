"""The static athlete and fight pages: the slug, and the files the build and the share images expect."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.build_seo_athletes import OUTPUT_PATH, athlete_slug

FRONTEND = Path(__file__).resolve().parents[2] / "frontend"


@pytest.mark.parametrize(
    ("name", "slug"),
    [
        ("Jon Jones", "jon-jones"),
        ("Jan Błachowicz", "jan-blachowicz"),
        ("B.J. Penn", "bj-penn"),
        ("Carlos Ulberg", "carlos-ulberg"),
        ("Mansur Abdul-Malik", "mansur-abdul-malik"),
        ("Jéssica Andrade", "jessica-andrade"),
    ],
)
def test_the_slug_is_the_name_the_way_the_app_matches_names(name, slug):
    assert athlete_slug(name) == slug


@pytest.fixture(scope="module")
def seo():
    return json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))


def test_every_athlete_has_its_own_slug(seo):
    slugs = [athlete["slug"] for athlete in seo["athletes"]]
    assert slugs and len(slugs) == len(set(slugs))
    assert all(athlete_slug(athlete["name"]) == athlete["slug"] for athlete in seo["athletes"])


def test_every_fight_names_two_athletes_of_its_slug(seo):
    for fight in seo["fights"]:
        assert fight["slug"] == f"{fight['a']['slug']}-vs-{fight['b']['slug']}"
        assert fight["position"] >= 1


def test_every_page_has_its_share_image(seo):
    for athlete in seo["athletes"]:
        assert (FRONTEND / "public" / "og" / "athletes" / f"{athlete['slug']}.jpg").exists(), athlete["slug"]
    for fight in seo["fights"]:
        assert (FRONTEND / "public" / "og" / "fights" / f"{fight['slug']}.jpg").exists(), fight["slug"]
