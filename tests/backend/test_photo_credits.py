"""The photos that come from ESPN, ufc.com or onefc.com are listed, so the site can print "Foto: ESPN" / "Foto: UFC" / "Foto: ONE" on them."""

from pathlib import Path

from src.ufc_predictor.config import BASE_DIR

PUBLIC = BASE_DIR / "frontend" / "public"


def _credit(client, line: str) -> list[str]:
    response = client.get("/photo-credits")
    assert response.status_code == 200
    return response.json()["credits"][line]


def _espn(client) -> list[str]:
    return _credit(client, "ESPN")


def _ufc(client) -> list[str]:
    return _credit(client, "UFC")


def test_the_espn_headshots_are_listed_without_their_cache_version(client):
    paths = _espn(client)
    assert "/fighter-photos/charles-oliveira.webp" in paths
    assert all(path.startswith("/fighter-photos/") and "?" not in path for path in paths)
    assert paths == sorted(set(paths))


def test_every_credited_photo_is_a_file_the_site_serves(client):
    missing = [path for path in _espn(client) if not (PUBLIC / path.lstrip("/")).exists()]
    assert missing == []


def test_the_bellator_archive_headshots_are_credited_too(client):
    assert any(path.startswith("/fighter-photos/bellator/") for path in _espn(client))


def test_a_photo_from_another_source_is_not_credited_to_espn(client):
    paths = _espn(client)
    assert not any(path.endswith("-champion.webp") for path in paths)  # the champions' photos come from ufc.com
    assert not any(path.startswith(("/fighter-photos/pfl/", "/fighter-photos/one/")) for path in paths)


def test_the_champions_belt_photos_are_credited_to_ufc(client):
    paths = _ufc(client)
    assert "/fighter-photos/alexander-volkanovski-champion.webp" in paths
    assert all(path.startswith("/fighter-photos/") and "?" not in path for path in paths)
    assert paths == sorted(set(paths))
    assert not set(paths) & set(_espn(client))
    assert [path for path in paths if not (PUBLIC / path.lstrip("/")).exists()] == []


def test_the_one_athlete_photos_are_credited_to_one(client):
    paths = _credit(client, "ONE")
    assert paths and all(path.startswith("/fighter-photos/one/") and "?" not in path for path in paths)
    assert paths == sorted(set(paths))
    assert not set(paths) & set(_espn(client)) and not set(paths) & set(_ufc(client))
    assert [path for path in paths if not (PUBLIC / path.lstrip("/")).exists()] == []


def test_the_list_is_cacheable(client):
    assert client.get("/photo-credits").headers["cache-control"].startswith("public, max-age=")
