import io
from types import SimpleNamespace

import pytest
import requests
from PIL import Image

from scripts import download_fighter_photos as photos

RANKINGS_HTML = """
<div class="view-grouping">
  <div class="view-grouping-header">Peso-mosca feminino</div>
  <div class="rankings--athlete--champion">
    <img src="https://ufc.com/images/styles/x/SILVA_NATALIA_BELT.png?itok=abc" width="208">
    <h5><a href="/athlete/natalia-silva">Natalia Silva</a></h5>
  </div>
</div>
<div class="view-grouping">
  <div class="view-grouping-header">Peso-pena feminino</div>
</div>
<div class="view-grouping">
  <div class="view-grouping-header">Women's Pound-for-PoundTop Rank</div>
  <div class="rankings--athlete--champion"><img src="https://ufc.com/p4p.png"><h5><a>Someone</a></h5></div>
</div>
"""


def png_bytes(size=(600, 436)):
    image = Image.new("RGBA", size, (255, 0, 0, 0))
    image.putpixel((10, 10), (255, 0, 0, 255))
    out = io.BytesIO()
    image.save(out, format="PNG")
    return out.getvalue()


def test_parse_champions_reads_division_champion_cards_and_skips_p4p_and_empty_divisions():
    assert photos.parse_champions(RANKINGS_HTML) == [
        ("Women's Flyweight", "Natalia Silva", "https://ufc.com/images/styles/x/SILVA_NATALIA_BELT.png?itok=abc")
    ]


def test_to_webp_shrinks_keeps_alpha_and_outputs_webp():
    encoded = photos.to_webp(png_bytes(), max_width=300)
    image = Image.open(io.BytesIO(encoded))
    assert image.format == "WEBP" and image.width == 300 and image.height == round(436 * 300 / 600)
    assert "A" in image.convert("RGBA").getbands()
    assert len(encoded) < len(png_bytes())


def test_to_webp_max_side_limits_the_longest_edge():
    image = Image.open(io.BytesIO(photos.to_webp(png_bytes((800, 1000)), max_side=420)))
    assert max(image.size) == 420


def test_slugify_is_ascii_and_stable():
    assert photos.slugify("Jiří Procházka") == "jiri-prochazka"
    assert photos.slugify("Sean King III") == "sean-king-iii"



def test_athlete_page_photo_skips_the_generic_silhouette():
    page = '<html><head><meta property="og:image" content="{}"></head></html>'
    assert photos.parse_athlete_photo(page.format("https://ufc.com/images/2026-09/DOE_JOHN_09-01.png")) == "https://ufc.com/images/2026-09/DOE_JOHN_09-01.png"
    assert photos.parse_athlete_photo(page.format("https://ufc.com/images/2019-04/SILHOUETTE.png?VersionId=x")) is None
    assert photos.parse_athlete_photo(page.format("https://ufc.com/images/2018-12/silhouette-headshot-female.png")) is None
    assert photos.parse_athlete_photo(page.format("https://ufc.com/images/image/fighter_images/ComingSoon/comingsoon_headshot_odopod.png")) is None
    assert photos.parse_athlete_photo("<html></html>") is None


def test_photo_skip_keys_asks_again_about_active_fighters_without_a_photo(monkeypatch):
    monkeypatch.setattr(photos, "covered_keys", lambda rows: {photos.name_key("Has Photo")})
    rows = [
        {"name": "Has Photo", "kind": "espn", "local_path": "x.webp"},
        {"name": "Old Retiree", "kind": "espn", "local_path": ""},  # ESPN had no photo, and the fighter is not active
        {"name": "New Debutant", "kind": "espn", "local_path": ""},  # ESPN had none yet, but the site lists them as active
        {"name": "Champ", "kind": "champion", "local_path": "c.webp"},
    ]
    recheck = {photos.name_key("New Debutant"), photos.name_key("Has Photo")}

    skip = photos.photo_skip_keys(rows, retry_missing=False, recheck=recheck)
    assert photos.name_key("Old Retiree") in skip  # not asked again
    assert photos.name_key("New Debutant") not in skip  # asked again
    assert photos.name_key("Has Photo") in skip and photos.name_key("Champ") in skip  # never overwrite a photo
    assert photos.name_key("Old Retiree") not in photos.photo_skip_keys(rows, retry_missing=True, recheck=set())


def test_a_commons_credit_names_the_author_and_license():
    assert photos.commons_credit('<a href="//x">Michael Dunn</a> from Silicon_Valley', "CC BY 2.5") == "Michael Dunn from Silicon Valley, CC BY 2.5, via Wikimedia Commons"
    assert photos.commons_credit("", "CC0").startswith("Unknown author, CC0")


def test_only_a_fighter_article_is_taken_from_wikipedia():
    assert photos.is_fighter_description("American mixed martial artist (born 1972)")
    assert photos.is_fighter_description("Dutch kickboxer and professional wrestler")
    assert not photos.is_fighter_description("American jazz saxophonist")
    assert not photos.is_fighter_description(None)


# --------------------------------------------------------------------------- champion photos

CARD = "https://ufc.com/images/styles/athlete_profile_listing_medium_1x/s3/2026-10/{}?itok=abc"
ORIGINAL = "https://ufc.com/images/2026-10/{}"


class UfcSite:
    """Answers for ufc.com: the rankings page with one champion, and images by address."""

    def __init__(self, picture, images):
        self.html = f"""<div class="view-grouping"><div class="view-grouping-header">Flyweight</div>
            <div class="rankings--athlete--champion"><img src="{CARD.format(picture)}"><h5><a>Natalia Silva</a></h5></div></div>"""
        self.images = images
        self.asked = []

    def get(self, url, **_):
        answer = requests.Response()
        answer.status_code = 200
        if url == photos.RANKINGS_URL:
            answer._content = self.html.encode()
            return answer
        self.asked.append(url)
        answer._content = self.images.get(url)
        if answer._content is None:
            answer.status_code = 404
        return answer


@pytest.fixture
def photo(tmp_path, monkeypatch):
    """The champion's photo file, in a temporary folder."""
    monkeypatch.setattr(photos, "PHOTOS_DIR", tmp_path)
    monkeypatch.setattr(photos, "BASE_DIR", tmp_path)
    monkeypatch.setattr(photos.time, "sleep", lambda _: None)
    return tmp_path / "natalia-silva-champion.webp"


def sync(site, rows):
    return photos.sync_champions(site, rows, SimpleNamespace(find=lambda fighter: (None, "none")))


def champion_row(picture="SILVA_BELT.png"):
    return {
        "name": "Natalia Silva", "kind": "champion", "source": "ufc.com (Flyweight)", "source_url": CARD.format(picture).split("?")[0],
        "image_url": "/fighter-photos/natalia-silva-champion.webp?v=old",
        "local_path": "frontend/public/fighter-photos/natalia-silva-champion.webp", "checked": "2026-11-15",
    }


def test_the_original_of_a_resized_picture_has_no_style_in_its_address():
    assert photos.original_image_url(CARD.format("SILVA_BELT.png")) == ORIGINAL.format("SILVA_BELT.png")
    assert photos.original_image_url(ORIGINAL.format("SILVA_BELT.png")) == ORIGINAL.format("SILVA_BELT.png")


def test_a_good_photo_of_the_same_picture_is_kept_and_nothing_is_downloaded(photo):
    good = photos.to_webp(png_bytes((832, 520)))
    photo.write_bytes(good)
    site = UfcSite("SILVA_BELT.png", {CARD.format("SILVA_BELT.png"): png_bytes((208, 130))})
    (row,) = sync(site, [champion_row()])
    assert site.asked == []
    assert photo.read_bytes() == good
    assert row["image_url"].endswith(f"?v={photos.version_tag(good)}")  # the tag is the kept file's, whatever it was before
    assert row["checked"] != "2026-11-15"


def test_a_new_picture_is_downloaded_at_its_original_size(photo):
    photo.write_bytes(photos.to_webp(png_bytes((832, 520))))
    site = UfcSite("SILVA_NEW.png", {ORIGINAL.format("SILVA_NEW.png"): png_bytes((520, 325)), CARD.format("SILVA_NEW.png"): png_bytes((208, 130))})
    (row,) = sync(site, [champion_row()])
    assert site.asked == [ORIGINAL.format("SILVA_NEW.png")]
    assert Image.open(photo).size == (520, 325)
    assert row["source_url"].endswith("SILVA_NEW.png")


def test_a_good_photo_is_not_traded_for_a_thumbnail(photo):
    good = photos.to_webp(png_bytes((832, 520)))
    photo.write_bytes(good)
    site = UfcSite("SILVA_NEW.png", {CARD.format("SILVA_NEW.png"): png_bytes((208, 130))})  # no original
    (row,) = sync(site, [champion_row()])
    assert photo.read_bytes() == good
    assert row["source_url"].endswith("SILVA_BELT.png")  # still the old picture, so the next run tries the new one again


def test_a_good_photo_stays_when_the_new_one_cannot_be_read_at_all(photo):
    good = photos.to_webp(png_bytes((832, 520)))
    photo.write_bytes(good)
    (row,) = sync(UfcSite("SILVA_NEW.png", {}), [champion_row()])
    assert photo.read_bytes() == good
    assert row["source_url"].endswith("SILVA_BELT.png")


def test_a_thumbnail_left_by_an_earlier_run_is_replaced(photo):
    photo.write_bytes(photos.to_webp(png_bytes((208, 130))))
    sync(UfcSite("SILVA_BELT.png", {ORIGINAL.format("SILVA_BELT.png"): png_bytes((520, 325))}), [champion_row()])
    assert Image.open(photo).size == (520, 325)


def test_a_new_champion_gets_a_thumbnail_when_there_is_nothing_better(photo):
    images = {ORIGINAL.format("SILVA_BELT.png"): b"<html>not an image</html>", CARD.format("SILVA_BELT.png"): png_bytes((208, 130))}
    (row,) = sync(UfcSite("SILVA_BELT.png", images), [])
    assert Image.open(photo).size == (208, 130)
    assert row["source_url"].endswith("SILVA_BELT.png")


def test_a_new_champion_with_no_readable_photo_fails_the_step(photo):
    with pytest.raises(RuntimeError, match="No readable champion photo"):
        sync(UfcSite("SILVA_BELT.png", {}), [])
