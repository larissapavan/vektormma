"""When each source was last refreshed, kept with the data in data/raw/refresh_status.json.

The site says how old its data is from this file (GET /data-info). The date of a file on the server cannot say it: in the
deployed image every file carries the date of the build.

    {"espn": {"last_success": "2026-11-25T07:40:12+00:00", "failing_since": null}, ...}

failing_since is the first failed run after the last good one, so a source that never worked counts too. A step that was
skipped keeps what it had.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from src.ufc_predictor.config import RAW_DATA_DIR

STATUS_PATH = RAW_DATA_DIR / "refresh_status.json"


def update_status(results: dict[str, bool | None], path: Path | None = None, now: datetime | None = None) -> dict[str, dict]:
    """results is source -> worked (None: not run). Writes the file and returns what it holds."""
    path = path or STATUS_PATH
    stamp = (now or datetime.now(timezone.utc)).isoformat(timespec="seconds")
    try:
        status = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        status = {}
    for source, worked in results.items():
        if worked is None:
            continue
        before = status.get(source, {})
        if worked:
            status[source] = {"last_success": stamp, "failing_since": None}
        else:
            status[source] = {"last_success": before.get("last_success"), "failing_since": before.get("failing_since") or stamp}
    if status:
        path.write_text(json.dumps(status, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    return status
