"""The uptime check: what it reports for a healthy site, a dead API and stale data."""

from __future__ import annotations

import json
from datetime import date

from scripts.check_site import MAX_STALE_DAYS, check_site, days_since, main

TODAY = date(2026, 11, 2)
HOME = '<html><body><div id="root"></div></body></html>'
SITEMAP = '<?xml version="1.0"?><urlset></urlset>'
HEALTH = json.dumps({"status": "ok", "model_loaded": True, "fighters_loaded": 2796})


def answers(overrides: dict[str, tuple[int, str]] | None = None):
    """A fetch function that serves a healthy site, with any path replaced by (status, body)."""
    table = {
        "/": (200, HOME),
        "/api/health": (200, HEALTH),
        "/api/data-info": (200, json.dumps({"last_updated": "2026-11-02"})),
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
    just_ok = date(2026, 11, 2).toordinal() - MAX_STALE_DAYS
    fresh_enough = json.dumps({"last_updated": date.fromordinal(just_ok).isoformat()})
    assert check_site("https://www.vektormma.com", TODAY, answers({"/api/data-info": (200, fresh_enough)})) == []

    too_old = json.dumps({"last_updated": date.fromordinal(just_ok - 1).isoformat()})
    problems = check_site("https://www.vektormma.com", TODAY, answers({"/api/data-info": (200, too_old)}))
    assert len(problems) == 1 and "daily update may be failing" in problems[0]


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
