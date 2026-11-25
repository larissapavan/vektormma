"""What went wrong lately: failed and slow requests, and errors in visitors' browsers.

Everything is kept in memory, for a day at most, as counts and timings: nothing about who asked. A restart empties it, which
is why `since` goes with every summary. The details of each problem are in the host's log, one line each; the summary
(GET /monitor) is what the uptime check reads to send an alert (scripts/check_site.py).
"""

from __future__ import annotations

import logging
import re
import threading
import time
from collections import Counter, deque
from datetime import datetime, timezone
from typing import Callable

logger = logging.getLogger(__name__)

WINDOW_HOURS = 24
SLOW_MS = 3000  # the first answer after a start may take this long; more often than that is a problem
MAX_REQUESTS = 5000
MAX_CLIENT_ERRORS = 500
LOGGED_PER_ERROR = 5  # a page that breaks for everyone must not fill the log with the same line
MIN_ROUTE_REQUESTS = 3
ROUTES_SHOWN = 8

_CONTROL = re.compile(r"[\x00-\x1f\x7f]+")
_QUERY = re.compile(r"[?#][^\s)'\"]*")
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")


def clean(text: str | None, limit: int) -> str:
    """One line, without what could identify someone: no query string, no fragment, no e-mail address."""
    text = _EMAIL.sub("[email]", _QUERY.sub("", text or ""))
    return _CONTROL.sub(" ", text).strip()[:limit]


def _quantile(ordered: list[float], share: float) -> int | None:
    return round(ordered[min(int(len(ordered) * share), len(ordered) - 1)]) if ordered else None


class Monitor:
    def __init__(self, clock: Callable[[], float] = time.time) -> None:
        self._clock = clock
        self._lock = threading.Lock()
        self.reset()

    def reset(self) -> None:
        with self._lock:
            self._since = self._clock()
            self._requests: deque[tuple[float, str, int, float]] = deque(maxlen=MAX_REQUESTS)
            self._client_errors: deque[tuple[float, str, str]] = deque(maxlen=MAX_CLIENT_ERRORS)
            self._logged: Counter[str] = Counter()

    def request(self, route: str, status: int, milliseconds: float) -> None:
        with self._lock:
            self._requests.append((self._clock(), route, status, milliseconds))
        if status >= 500:
            logger.error("request failed route=%s status=%d ms=%d", route, status, milliseconds)
        elif milliseconds >= SLOW_MS:
            logger.warning("slow request route=%s status=%d ms=%d", route, status, milliseconds)

    def client_error(self, kind: str, message: str, stack: str, path: str, build: str, language: str) -> None:
        message, stack, path = clean(message, 300), clean(stack, 1500), clean(path, 200)
        fingerprint = f"{kind}|{message}"
        with self._lock:
            self._client_errors.append((self._clock(), kind, message))
            self._logged[fingerprint] += 1
            worth_logging = self._logged[fingerprint] <= LOGGED_PER_ERROR
        if worth_logging:
            logger.error(
                "client error kind=%s path=%s build=%s lang=%s message=%s stack=%s", kind, path, clean(build, 40), clean(language, 10), message, stack
            )

    def summary(self) -> dict:
        """Counts and timings of the last day. No message and no path of a client error: the answer is public."""
        since = self._clock() - WINDOW_HOURS * 3600
        with self._lock:
            requests = [row for row in self._requests if row[0] >= since]
            errors = [row for row in self._client_errors if row[0] >= since]
            started = self._since
        timings = sorted(ms for _, _, _, ms in requests)
        by_route: dict[str, list[tuple[int, float]]] = {}
        for _, route, status, ms in requests:
            by_route.setdefault(route, []).append((status, ms))
        routes: list[dict] = [
            {
                "route": route,
                "requests": len(rows),
                "server_errors": sum(status >= 500 for status, _ in rows),
                "p95_ms": _quantile(sorted(ms for _, ms in rows), 0.95),
            }
            for route, rows in by_route.items()
            if len(rows) >= MIN_ROUTE_REQUESTS
        ]
        return {
            "since": datetime.fromtimestamp(max(started, since), timezone.utc).isoformat(timespec="seconds"),
            "requests": len(requests),
            "server_errors": sum(status >= 500 for _, _, status, _ in requests),
            "slow_requests": sum(ms >= SLOW_MS for _, _, _, ms in requests),
            "p50_ms": _quantile(timings, 0.5),
            "p95_ms": _quantile(timings, 0.95),
            "routes": sorted(routes, key=lambda row: -(row["p95_ms"] or 0))[:ROUTES_SHOWN],
            "client_errors": len(errors),
            "client_error_kinds": dict(Counter(kind for _, kind, _ in errors)),
            "distinct_client_errors": len({(kind, message) for _, kind, message in errors}),
        }


monitor = Monitor()
