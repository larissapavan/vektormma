"""Lets the CDN in front of the API keep answering while the host behind it is asleep.

The API runs on a free host that stops after a while without visitors, and the first request after that waits many
seconds for it to start. Every read-only answer already says how long a browser may keep it (`public, max-age=N`).
This adds the same freshness for the CDN (`s-maxage`, which browsers ignore) and lets it hand out the last copy right
away while it fetches a new one in the background (`stale-while-revalidate`, sent in `CDN-Cache-Control` so it applies to
the CDN only: a browser keeps following `max-age`, so nobody sees a day-old page).

Only answers shaped exactly like `public, max-age=N` are touched, so /health (which has to reflect the real state of the
host), the prediction POST and any error stay as they are.
"""

from __future__ import annotations

import re

# How long the CDN may serve an expired copy while it refreshes it: a day, longer than the host stays asleep.
STALE_WHILE_REVALIDATE_SECONDS = 86_400

_PUBLIC_MAX_AGE = re.compile(r"^public,\s*max-age=(\d+)$")


def edge_cache_headers(cache_control: str) -> dict[str, str]:
    """The headers to send instead of `cache_control`: the same value plus the CDN's. Empty when it should be left alone."""
    match = _PUBLIC_MAX_AGE.match(cache_control.strip())
    if match is None or int(match.group(1)) == 0:
        return {}
    seconds = match.group(1)
    return {
        "Cache-Control": f"public, max-age={seconds}, s-maxage={seconds}",
        "CDN-Cache-Control": f"max-age={seconds}, stale-while-revalidate={STALE_WHILE_REVALIDATE_SECONDS}",
    }
