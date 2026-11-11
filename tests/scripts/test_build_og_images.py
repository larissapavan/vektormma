"""The share images: the text helpers and a full render, with no photos (the initials badge stands in)."""

from __future__ import annotations

import pytest

from scripts import build_og_images as og


@pytest.mark.parametrize(
    ("value", "text"),
    [(0.95, "90%+"), (0.9, "90%+"), (0.8999, "90%"), (0.63, "63%"), (0.5, "50%"), (0.1, "<10%"), (0.05, "<10%"), (0.1001, "10%")],
)
def test_odds_never_show_an_exact_number_past_90_percent(value, text):
    """The same rule as frontend/src/shared/data/probability.ts: the images must not say more than the page does."""
    assert og.odds(value) == text


def test_the_record_needs_both_wins_and_losses():
    assert og.record_text({"wins": 12, "losses": 3, "draws": 1}) == "12-3-1"
    assert og.record_text({"wins": 12, "losses": 3}) == "12-3-0"
    assert og.record_text({"wins": 0, "losses": 0, "draws": None}) == "0-0-0"
    assert og.record_text({"wins": 12}) is None
    assert og.record_text({}) is None


def test_a_short_name_stays_on_one_line_and_a_long_one_is_split_in_two():
    lines, _ = og.wrap_name("Jon Jones", 640, 300)
    assert lines == ["Jon Jones"]
    long_name = "Maurício Rua Alexandre Pereira dos Santos Filho"
    lines, font = og.wrap_name(long_name, 640, 300)
    assert len(lines) == 2 and " ".join(lines) == long_name
    assert og.ImageDraw.Draw(og.Image.new("RGB", (1, 1))).textlength(max(lines, key=len), font=font) <= 640 or font.size == 40


def test_the_name_never_grows_taller_than_its_space():
    _, font = og.wrap_name("Jon Jones", 640, 70)
    assert font.size <= 70


def test_a_single_word_name_is_never_split():
    lines, _ = og.wrap_name("Supercalifragilisticexpialidocious" * 2, 300, 300)
    assert len(lines) == 1


def test_initials_use_the_first_two_words():
    badge = og.initials("Charles Do Bronx Oliveira", 120, 100, og.PANEL, og.MUTED)
    assert badge.size == (120, 100) and badge.mode == "RGBA"


def test_a_missing_photo_gives_no_cutout(tmp_path, monkeypatch):
    monkeypatch.setattr(og, "PHOTOS", tmp_path)
    assert og.cutout(None, 100, 100) is None
    assert og.cutout("nobody.webp", 100, 100) is None


def test_the_photo_is_found_without_its_cache_busting_query(tmp_path, monkeypatch):
    """athletes.json writes `name.webp?v=hash`; the card must still find name.webp."""
    monkeypatch.setattr(og, "PHOTOS", tmp_path)
    og.Image.new("RGBA", (200, 100), (10, 20, 30, 255)).save(tmp_path / "jon-jones.webp")
    sprite = og.cutout("jon-jones.webp?v=abc123", 80, 60)
    assert sprite is not None and sprite.size == (80, 60)


def test_the_digest_changes_with_the_content_and_with_the_design(monkeypatch, tmp_path):
    monkeypatch.setattr(og, "PHOTOS", tmp_path)
    first = og.digest({"name": "A"}, [None])
    assert first == og.digest({"name": "A"}, [None]) and len(first) == 12
    assert first != og.digest({"name": "B"}, [None])
    monkeypatch.setattr(og, "DESIGN_VERSION", "next")
    assert first != og.digest({"name": "A"}, [None])


def test_the_digest_changes_when_a_photo_changes(monkeypatch, tmp_path):
    monkeypatch.setattr(og, "PHOTOS", tmp_path)
    (tmp_path / "a.webp").write_bytes(b"one")
    before = og.digest({}, ["a.webp"])
    (tmp_path / "a.webp").write_bytes(b"two")
    assert og.digest({}, ["a.webp"]) != before


def test_an_athlete_image_and_a_fight_image_render_at_the_share_size(monkeypatch, tmp_path):
    monkeypatch.setattr(og, "PHOTOS", tmp_path)
    athlete = og.draw_athlete({"name": "Islam Makhachev", "wins": 27, "losses": 1, "draws": 0, "photo": None})
    assert athlete.size == (og.W, og.H)
    fighter = {"name": "Islam Makhachev", "wins": 27, "losses": 1, "photo": None}
    rival = {"name": "Arman Tsarukyan", "wins": 22, "losses": 3, "photo": None}
    fight = {"position": 1, "titleFight": True, "event": "UFC 311", "date": "2026-01-18", "a": fighter, "b": rival,
             "pick": {"probability": 0.97, "winnerIsA": True}}
    assert og.draw_fight(fight).size == (og.W, og.H)
    assert og.draw_fight({**fight, "pick": None, "titleFight": False, "position": 5}).size == (og.W, og.H)
