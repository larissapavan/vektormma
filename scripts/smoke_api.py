"""Does the API still work with the data that is about to be committed?

    python -m scripts.smoke_api

The daily refresh runs it before committing. It starts the real app in this process, opens the lists every page needs and
asks for one prediction. The whole test suite is a different question (is the code right?) and runs after the commit, so that a
test about something else does not cost a day of data.
"""

from __future__ import annotations

import logging
import os
import sys

# Pages that cannot be empty. What comes from a source that can be quiet (upcoming cards, news) only has to answer.
NOT_EMPTY = ["/fighters?ufc_only=true", "/events", "/rankings", "/champions", "/gyms", "/orgs"]
ANSWERS = ["/health", "/data-info", "/track-record", "/events/upcoming", "/predict/upcoming", "/results/recent", "/record-book", "/cancelled-fights"]
ORG_PAGES = ["fighters", "events", "events/upcoming", "rankings", "data-info"]


def check(client) -> list[str]:
    """What is wrong, as readable lines; an empty list means all is well."""
    problems = []

    def get(path: str):
        response = client.get(path)
        if response.status_code != 200:
            problems.append(f"GET {path} answered {response.status_code}")
            return None
        return response.json()

    for path in NOT_EMPTY:
        body = get(path)
        if body is not None and not body:
            problems.append(f"GET {path} is empty")
    for path in ANSWERS:
        get(path)
    if not (get("/health") or {}).get("model_loaded"):
        problems.append("the prediction model is not loaded")
    for org in get("/orgs") or []:
        for page in ORG_PAGES:
            get(f"/orgs/{org['id']}/{page}")

    ranked = next((c["entries"] for c in get("/rankings") or [] if not c["is_p4p"] and len(c["entries"]) >= 2), None)
    if ranked is None:
        problems.append("no division has two ranked fighters")
    else:
        one, two = ranked[0]["fighter"], ranked[1]["fighter"]
        status = client.post("/predict", json={"fighter_a": one, "fighter_b": two}).status_code
        if status != 200:
            problems.append(f"POST /predict {one} vs {two} answered {status}")
    return problems


def main() -> int:
    from fastapi.testclient import TestClient

    from backend.app.main import app

    logging.getLogger("httpx").setLevel(logging.WARNING)  # one line per request says nothing here
    with TestClient(app) as client:
        problems = check(client)
    for problem in problems:
        print(f"[invalid] {problem}")
        if os.environ.get("GITHUB_ACTIONS") == "true":
            print(f"::error title=The API fails on the refreshed data::{problem}")
    if problems:
        return 1
    print("[ok] the API works with the refreshed data")
    return 0


if __name__ == "__main__":
    sys.exit(main())
