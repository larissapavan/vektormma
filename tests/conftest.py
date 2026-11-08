import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def two_fighter_names(client: TestClient) -> tuple[str, str]:
    response = client.get("/fighters")
    fighters = response.json()
    assert len(fighters) >= 2, "Need at least two fighters in the catalog to run matchup tests."
    return fighters[0]["name"], fighters[1]["name"]


def _tracked_changes() -> set[str] | None:
    """The tracked files that differ from the last commit, or None when git cannot say (no git, or not a repository)."""
    try:
        done = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=no"], cwd=Path(__file__).parent.parent, capture_output=True, text=True, timeout=60, check=True
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return {line for line in done.stdout.splitlines() if line.strip()}


@pytest.fixture(scope="session", autouse=True)
def tests_leave_tracked_files_alone():
    """A test run must not change a file the repository tracks. Some scripts the tests reach write generated files (the SEO data,
    the share images); a test that lets one run for real would leave the working tree dirty and, worse, would depend on today's date.
    A change that was already there when the run began is not blamed on it."""
    before = _tracked_changes()
    yield
    after = _tracked_changes()
    if before is None or after is None:
        return
    leaked = sorted(after - before)
    assert not leaked, "The tests changed tracked files (a script that writes them ran for real?):\n" + "\n".join(leaked[:20])
