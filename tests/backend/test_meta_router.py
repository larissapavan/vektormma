import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.rate_limit import limiter
from backend.app.routers.meta import build_meta_router
from backend.app.services.prediction_service import PredictionService


def test_root_lists_available_endpoints(client):
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["health"] == "/health"
    assert body["predict"] == "/predict"


def test_health_reports_model_and_fighters_loaded(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
    assert body["fighters_loaded"] > 0
    assert body["fights_tracked"] > 0
    assert body["latest_fight_date"]


def test_model_info_reports_metrics_and_features(client):
    response = client.get("/model-info")
    assert response.status_code == 200
    body = response.json()
    assert body["feature_count"] == len(body["features"])
    assert 0.0 <= body["metrics"]["accuracy"] <= 1.0
    assert body["baseline_metrics"]  # whichever model is served, what it was compared with


def test_responses_include_security_headers(client):
    response = client.get("/health")
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


def test_data_info_reports_real_counts_and_sources(client):
    response = client.get("/data-info")
    assert response.status_code == 200
    body = response.json()

    assert body["fighters_count"] > 1000
    assert body["events_count"] > 0
    assert body["fights_count"] > 0
    # The UFC's own sources come first, and every other organization's source is listed too (the list is not UFC-only).
    assert body["sources"][:2] == ["ufcstats.com", "ufc.com"]
    assert len(body["sources"]) == len(set(body["sources"]))
    from backend.app.services.org_service import ORGS

    assert {source for org in ORGS.values() for source in org.sources} <= set(body["sources"])  # each organization's source is credited

    import datetime

    # A day in UTC can be one ahead of the local one.
    assert datetime.date.fromisoformat(body["last_updated"]) <= datetime.date.today() + datetime.timedelta(days=1)


def test_data_info_dates_the_data_by_its_refresh_and_not_by_the_files(client, tmp_path, monkeypatch):
    from backend.app.services import data_info_service

    status = tmp_path / "refresh_status.json"
    monkeypatch.setattr(data_info_service, "REFRESH_STATUS_PATH", status)
    body = client.get("/data-info").json()
    assert body["refresh"] == [] and body["last_updated"] == body["latest_fight_date"]  # nothing recorded: the newest fight

    status.write_text(
        '{"gyms": {"last_success": null, "failing_since": "2026-11-20T07:00:00+00:00"},'
        ' "espn": {"last_success": "2026-11-24T07:00:00+00:00", "failing_since": null}}',
        encoding="utf-8",
    )
    body = client.get("/data-info").json()
    assert body["last_updated"] == "2026-11-24"
    assert body["refresh"] == [
        {"source": "espn", "last_success": "2026-11-24", "failing_since": None},
        {"source": "gyms", "last_success": None, "failing_since": "2026-11-20"},
    ]


@pytest.fixture(scope="module")
def earlier_model_client():
    """The earlier model (PREDICTION_MODEL=current), mounted on its own app so the session's client is left alone."""
    app = FastAPI()
    app.state.limiter = limiter
    service = PredictionService()
    app.include_router(build_meta_router(lambda: service))
    return TestClient(app)


def test_model_info_of_the_earlier_model_sends_the_measured_result_and_says_the_reported_one_could_not_be_reproduced(earlier_model_client):
    body = earlier_model_client.get("/model-info").json()
    measured = body["recent_evaluation"]
    assert measured["fights"] > 1000 and 0.5 < measured["accuracy"] < 0.7  # what the model really does on recent fights
    assert f"Measured on {measured['fights']:,} recent fights" in body["metrics_note"]
    assert "could not be reproduced" in body["metrics_note"] and f"{body['metrics']['accuracy']:.1%}" in body["metrics_note"]
    assert any("could not be reproduced" in item for item in body["limitations"])
    assert any("overconfident" in item for item in body["limitations"])
    assert body["limitations"][-1].startswith("This is a personal project")  # the disclaimer stays last
