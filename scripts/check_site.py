"""Check that the public site and its API are up and that the data is fresh.

    python -m scripts.check_site [--base https://www.vektormma.com]

The uptime workflow (.github/workflows/uptime.yml) runs it every half hour; a failing run makes GitHub e-mail the owner
of the workflow, which is the whole alert. It uses the standard library only, so the workflow needs no install step.

What it checks, and why:

  - the home page answers with the app's root element (the host is up and the build is the app);
  - /api/health, which goes through the Vercel rewrite to the Railway API, says the model and the catalog are loaded;
  - /api/data-info says the events and results were refreshed within MAX_STALE_DAYS, and that no other source has been failing
    for longer than MAX_FAILING_DAYS. The daily update (update-data.yml) commits when each source last worked
    (data/raw/refresh_status.json) and the API redeploys with it;
  - /api/monitor does not show failing requests or pages breaking in visitors' browsers (the details are in the API host's log);
  - the sitemap is served, because search engines read it from there.

A request is tried a few times before it counts as a failure: the API may be waking up, and one dropped packet should not
send an alert.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import date

DEFAULT_BASE = "https://www.vektormma.com"
# The refresh runs daily and records every success, even on a day with no news: three days without one is a real problem.
MAX_STALE_DAYS = 3
# Until a refresh has recorded anything, the date is the newest fight's, and there are weeks with no card.
MAX_STALE_DAYS_UNRECORDED = 15
# One of the smaller sources may be down for a few days without anyone having to do something about it.
MAX_FAILING_DAYS = 7
# One failed request or one odd browser is not an alert. Counts are of the last day, or since the API last started.
MIN_SERVER_ERRORS = 5
MAX_SERVER_ERROR_SHARE = 0.02
MAX_CLIENT_ERRORS = 20
ATTEMPTS = 3
TIMEOUT_SECONDS = 30
RETRY_DELAY_SECONDS = 10


def fetch(url: str, attempts: int = ATTEMPTS, delay: float = RETRY_DELAY_SECONDS) -> tuple[int, str]:
    """(status, body) of a GET. A status of 0 means the request never got an answer."""
    status, body = 0, ""
    for attempt in range(attempts):
        request = urllib.request.Request(url, headers={"User-Agent": "vektormma-uptime-check/1.0"})
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                return response.status, response.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as error:
            status, body = error.code, ""
        except (urllib.error.URLError, TimeoutError, OSError):
            status, body = 0, ""
        if attempt < attempts - 1:
            time.sleep(delay)
    return status, body


def _json(body: str) -> dict:
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def days_since(day: str | None, today: date) -> int | None:
    """Whole days from an ISO date (2026-11-02) to today, or None when it is missing or not a date."""
    if not day:
        return None
    try:
        return (today - date.fromisoformat(day[:10])).days
    except ValueError:
        return None


def check_site(base: str = DEFAULT_BASE, today: date | None = None, get=None) -> list[str]:
    """What is wrong, as readable lines; an empty list means all is well. `get` is the fetch function (replaced in tests)."""
    today = today or date.today()
    get = get or fetch
    base = base.rstrip("/")
    problems: list[str] = []

    status, body = get(f"{base}/")
    if status != 200:
        problems.append(f"Home page answered {status or 'nothing'} (expected 200).")
    elif '<div id="root">' not in body:
        problems.append("Home page does not contain the app's root element.")

    status, body = get(f"{base}/api/health")
    health = _json(body)
    if status != 200:
        problems.append(f"/api/health answered {status or 'nothing'} (expected 200): the API is down or unreachable.")
    else:
        if health.get("status") != "ok":
            problems.append(f"/api/health status is {health.get('status')!r}, not 'ok'.")
        if not health.get("model_loaded"):
            problems.append("/api/health says the prediction model is not loaded.")
        if not health.get("fighters_loaded"):
            problems.append("/api/health says no fighters are loaded.")

    status, body = get(f"{base}/api/data-info")
    if status != 200:
        problems.append(f"/api/data-info answered {status or 'nothing'} (expected 200).")
    else:
        info = _json(body)
        refresh = info.get("refresh") or []
        last_updated = info.get("last_updated")
        age = days_since(last_updated, today)
        if age is None:
            problems.append(f"/api/data-info has no usable last_updated date ({last_updated!r}).")
        elif age > (MAX_STALE_DAYS if refresh else MAX_STALE_DAYS_UNRECORDED):
            problems.append(f"The data was last refreshed {age} days ago ({last_updated}); the daily update may be failing.")
        for entry in refresh:
            failing = days_since(entry.get("failing_since"), today)
            if failing is not None and failing > MAX_FAILING_DAYS:
                problems.append(f"The source {entry.get('source')} has been failing for {failing} days (last worked: {entry.get('last_success') or 'never'}).")

    # An API from before this endpoint answers 404; whether the API is up at all was asked above.
    status, body = get(f"{base}/api/monitor")
    seen = _json(body) if status == 200 else {}
    failed, total = seen.get("server_errors") or 0, seen.get("requests") or 0
    if failed >= MIN_SERVER_ERRORS and failed > total * MAX_SERVER_ERROR_SHARE:
        worst = max(seen.get("routes") or [{}], key=lambda row: row.get("server_errors", 0)).get("route", "unknown")
        problems.append(f"{failed} of {total} API requests failed since {seen.get('since')} (most on {worst}). See the API host's log: 'request failed'.")
    broken = seen.get("client_errors") or 0
    if broken >= MAX_CLIENT_ERRORS:
        problems.append(
            f"Pages broke {broken} times in visitors' browsers since {seen.get('since')} "
            f"({seen.get('distinct_client_errors')} different errors). See the API host's log: 'client error'."
        )

    status, body = get(f"{base}/sitemap.xml")
    if status != 200 or "<urlset" not in body:
        problems.append(f"sitemap.xml is missing or invalid (status {status or 'nothing'}).")

    return problems


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base", default=DEFAULT_BASE, help="site address to check")
    args = parser.parse_args(argv)
    problems = check_site(args.base)
    if problems:
        for problem in problems:
            print(f"PROBLEM: {problem}")
        return 1
    print(f"OK: {args.base} is up and its data is fresh.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
