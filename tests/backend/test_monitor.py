"""What went wrong lately: failed and slow requests, and errors in visitors' browsers."""

import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app import main
from backend.app.services import monitor_service
from backend.app.services.monitor_service import Monitor, clean, monitor

REPORT = {"kind": "render", "message": "x is undefined", "stack": "at Page (https://www.vektormma.com/assets/a.js:1:2)", "path": "/fighters", "build": "abc", "language": "pt-BR"}


@pytest.fixture(autouse=True)
def empty():
    monitor.reset()
    yield
    monitor.reset()


class Clock:
    def __init__(self):
        self.now = 1_000_000.0

    def __call__(self):
        return self.now


def test_requests_are_counted_by_route_template_and_never_by_address(client):
    client.get("/fighters/Alex Pereira/elo?x=1")
    client.get("/fighters/Nobody Atall/elo")
    client.get("/no-such-page")
    seen = [row[1] for row in monitor._requests]
    assert seen == ["GET /fighters/{name}/elo", "GET /fighters/{name}/elo", "GET (no route)"]
    assert client.get("/monitor").json()["server_errors"] == 0


def test_an_exception_counts_as_a_failed_request_and_is_logged(caplog):
    app = FastAPI()
    app.middleware("http")(main.time_requests)

    @app.get("/boom/{who}")
    def boom(who: str):
        raise RuntimeError("no")

    with caplog.at_level(logging.ERROR, logger=monitor_service.logger.name):
        assert TestClient(app, raise_server_exceptions=False).get("/boom/ana").status_code == 500
    assert monitor.summary()["server_errors"] == 1
    assert "request failed route=GET /boom/{who} status=500" in caplog.text and "ana" not in caplog.text


def test_the_summary_is_of_the_last_day():
    clock = Clock()
    watched = Monitor(clock)
    for status, ms in ((200, 100), (200, 200), (503, 4000)):
        watched.request("GET /a", status, ms)
    summary = watched.summary()
    assert (summary["requests"], summary["server_errors"], summary["slow_requests"], summary["p50_ms"], summary["p95_ms"]) == (3, 1, 1, 200, 4000)
    assert summary["routes"] == [{"route": "GET /a", "requests": 3, "server_errors": 1, "p95_ms": 4000}]
    clock.now += 25 * 3600
    assert watched.summary()["requests"] == 0 and watched.summary()["p95_ms"] is None


def test_a_client_error_is_logged_counted_and_answered_with_nothing(client, caplog):
    with caplog.at_level(logging.ERROR, logger=monitor_service.logger.name):
        response = client.post("/client-errors", json=REPORT)
    assert response.status_code == 204 and response.content == b""
    assert "client error kind=render path=/fighters build=abc lang=pt-BR message=x is undefined" in caplog.text
    summary = client.get("/monitor").json()
    assert (summary["client_errors"], summary["client_error_kinds"], summary["distinct_client_errors"]) == (1, {"render": 1}, 1)
    assert "undefined" not in str(summary) and "/fighters" not in [row["route"] for row in summary["routes"]]  # public: no message


def test_the_same_error_from_everyone_does_not_fill_the_log(caplog):
    watched = Monitor()
    with caplog.at_level(logging.ERROR, logger=monitor_service.logger.name):
        for _ in range(50):
            watched.client_error("render", "same", "", "/", "b", "en")
    assert len(caplog.records) == monitor_service.LOGGED_PER_ERROR
    assert watched.summary()["client_errors"] == 50


def test_what_could_identify_someone_or_forge_a_log_line_is_removed():
    assert clean("boom\nERROR forged line", 300) == "boom ERROR forged line"
    assert clean("at f (https://www.vektormma.com/a.js?v=1&who=ana:3:4)", 300) == "at f (https://www.vektormma.com/a.js)"
    assert clean("mail ana@example.com now", 300) == "mail [email] now"
    assert len(clean("x" * 900, 300)) == 300


@pytest.mark.parametrize("broken", [{"kind": "other"}, {"message": ""}, {"message": "x" * 501}, {"stack": "x" * 4001}, {"path": "x" * 301}])
def test_a_report_that_is_not_one_is_refused(client, broken):
    assert client.post("/client-errors", json={**REPORT, **broken}).status_code == 422
    assert monitor.summary()["client_errors"] == 0


def test_reports_are_rate_limited(client):
    statuses = [client.post("/client-errors", json=REPORT).status_code for _ in range(21)]
    assert statuses[:20] == [204] * 20 and statuses[20] == 429


def test_the_summary_is_never_cached(client):
    assert client.get("/monitor").headers["cache-control"] == "no-store"
