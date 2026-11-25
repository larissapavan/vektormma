"""The uptime check: what it reports for a healthy site, a dead API and stale data."""

from __future__ import annotations

import json
from datetime import date

from scripts.check_site import MAX_FAILING_DAYS, MAX_STALE_DAYS, MAX_STALE_DAYS_UNRECORDED, check_site, days_since, main

TODAY = date(2026, 11, 2)
MONITOR = json.dumps({"since": "2026-11-01T00:00:00+00:00", "requests": 1000, "server_errors": 4, "client_errors": 3, "distinct_client_errors": 2, "routes": []})
HOME = '<html><body><div id="root"></div></body></html>'
SITEMAP = '<?xml version="1.0"?><urlset></urlset>'
HEALTH = json.dumps({"status": "ok", "model_loaded": True, "fighters_loaded": 2796})


def answers(overrides: dict[str, tuple[int, str]] | None = None):
    """A fetch function that serves a healthy site, with any path replaced by (status, body)."""
    table = {
        "/": (200, HOME),
        "/api/health": (200, HEALTH),
        "/api/data-info": (200, json.dumps({"last_updated": "2026-11-02"})),
        "/api/monitor": (200, MONITOR),
        "/sitemap.xml": (200, SITEMAP),
    }
    table.update(overrides or {})

    def get(url: str):
        path = url.split("vektormma.com", 1)[1] or "/"
        return table[path]

    return get


def test_a_healthy_site_has_no_problems():
    assert check_site("https://www.vektormma.com", TODAY, answers()) == []


def test_a_dead_api_is_reported():
    problems = check_site("https://www.vektormma.com", TODAY, answers({"/api/health": (0, "")}))
    assert len(problems) == 1 and "/api/health" in problems[0] and "down" in problems[0]


def test_an_api_without_its_model_is_reported():
    unhealthy = json.dumps({"status": "ok", "model_loaded": False, "fighters_loaded": 10})
    problems = check_site("https://www.vektormma.com", TODAY, answers({"/api/health": (200, unhealthy)}))
    assert problems == ["/api/health says the prediction model is not loaded."]


def test_stale_data_is_reported_only_past_the_limit():
    recorded = [{"source": "espn", "last_success": "2026-10-30", "failing_since": None}]
    just_ok = date(2026, 11, 2).toordinal() - MAX_STALE_DAYS
    fresh_enough = json.dumps({"last_updated": date.fromordinal(just_ok).isoformat(), "refresh": recorded})
    assert check_site("https://www.vektormma.com", TODAY, answers({"/api/data-info": (200, fresh_enough)})) == []

    too_old = json.dumps({"last_updated": date.fromordinal(just_ok - 1).isoformat(), "refresh": recorded})
    problems = check_site("https://www.vektormma.com", TODAY, answers({"/api/data-info": (200, too_old)}))
    assert len(problems) == 1 and "daily update may be failing" in problems[0]


def test_before_any_recorded_refresh_the_date_is_the_newest_fight_and_may_be_older():
    just_ok = TODAY.toordinal() - MAX_STALE_DAYS_UNRECORDED
    for day, expected in ((just_ok, 0), (just_ok - 1, 1)):
        body = json.dumps({"last_updated": date.fromordinal(day).isoformat(), "refresh": []})
        assert len(check_site("https://www.vektormma.com", TODAY, answers({"/api/data-info": (200, body)}))) == expected


def test_a_source_that_has_been_failing_for_long_is_reported_by_name():
    since = TODAY.toordinal() - MAX_FAILING_DAYS
    for day, expected in ((since, 0), (since - 1, 1)):
        entry = {"source": "gyms", "last_success": None, "failing_since": date.fromordinal(day).isoformat()}
        body = json.dumps({"last_updated": "2026-11-02", "refresh": [entry]})
        problems = check_site("https://www.vektormma.com", TODAY, answers({"/api/data-info": (200, body)}))
        assert len(problems) == expected and all("gyms" in problem and "never" in problem for problem in problems)


def monitor_says(**numbers):
    body = json.dumps({**json.loads(MONITOR), **numbers})
    return check_site("https://www.vektormma.com", TODAY, answers({"/api/monitor": (200, body)}))


def test_failing_requests_are_reported_with_the_worst_route_and_a_few_are_not():
    routes = [{"route": "GET /rankings", "server_errors": 1}, {"route": "POST /predict", "server_errors": 29}]
    problems = monitor_says(server_errors=30, routes=routes)
    assert len(problems) == 1 and "30 of 1000" in problems[0] and "POST /predict" in problems[0]
    assert monitor_says(server_errors=15) == []  # under 2% of the requests
    assert monitor_says(server_errors=3, requests=10) == []  # too few to mean anything


def test_pages_breaking_in_browsers_are_reported():
    assert monitor_says(client_errors=19) == []
    problems = monitor_says(client_errors=20)
    assert len(problems) == 1 and "20 times" in problems[0] and "2 different errors" in problems[0]


def test_an_api_without_the_monitor_is_not_a_problem():
    assert check_site("https://www.vektormma.com", TODAY, answers({"/api/monitor": (404, "")})) == []


def test_a_page_that_is_not_the_app_or_a_missing_sitemap_is_reported():
    problems = check_site("https://www.vektormma.com", TODAY, answers({"/": (200, "<html>parked domain</html>"), "/sitemap.xml": (404, "")}))
    assert len(problems) == 2


def test_days_since_handles_missing_and_malformed_dates():
    assert days_since("2026-10-30", TODAY) == 3
    assert days_since(None, TODAY) is None
    assert days_since("not a date", TODAY) is None


def test_main_exits_with_one_when_something_is_wrong(monkeypatch, capsys):
    monkeypatch.setattr("scripts.check_site.fetch", lambda url, *a, **k: (0, ""))
    assert main(["--base", "https://www.vektormma.com"]) == 1
    assert "PROBLEM" in capsys.readouterr().out
