import pytest

from backend.app.utils.edge_cache import STALE_WHILE_REVALIDATE_SECONDS, edge_cache_headers


@pytest.mark.parametrize("value", ["public, max-age=300", "public,max-age=3600", " public, max-age=600 "])
def test_a_public_answer_gets_the_cdn_headers(value):
    seconds = value.split("max-age=")[1].strip()
    headers = edge_cache_headers(value)

    assert headers["Cache-Control"] == f"public, max-age={seconds}, s-maxage={seconds}"
    assert headers["CDN-Cache-Control"] == f"max-age={seconds}, stale-while-revalidate={STALE_WHILE_REVALIDATE_SECONDS}"
    # A browser must keep following max-age: stale-while-revalidate is for the CDN only.
    assert "stale-while-revalidate" not in headers["Cache-Control"]


@pytest.mark.parametrize(
    "value",
    ["public, max-age=0", "no-store", "private, max-age=300", "public, max-age=300, s-maxage=60", "max-age=300", ""],
)
def test_anything_else_is_left_alone(value):
    assert edge_cache_headers(value) == {}


def test_a_cached_read_is_sent_with_the_cdn_headers(client):
    response = client.get("/fighters", params={"limit": 3})

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "public, max-age=300, s-maxage=300"
    assert response.headers["CDN-Cache-Control"] == f"max-age=300, stale-while-revalidate={STALE_WHILE_REVALIDATE_SECONDS}"


def test_health_is_never_cached_by_the_cdn(client):
    # The loading screen and the keep-warm job read /health to learn whether the host is awake.
    response = client.get("/health")

    assert response.status_code == 200
    assert "CDN-Cache-Control" not in response.headers
    assert "s-maxage" not in response.headers.get("Cache-Control", "")


def test_a_prediction_and_an_error_are_not_cached(client, two_fighter_names):
    first, second = two_fighter_names
    prediction = client.post("/predict", json={"fighter_a": first, "fighter_b": second})
    missing = client.get("/fighters/Nobody Atall/similar")

    assert prediction.status_code == 200
    assert "CDN-Cache-Control" not in prediction.headers
    assert missing.status_code == 404
    assert "CDN-Cache-Control" not in missing.headers
