"""Put back the files of a source whose refresh came out broken, so that it does not hold back the ones that worked.

validate_data says which file is wrong ("gym_fighters.csv: rows dropped from 2914 to 1959"). Each file belongs to a group that
is written together; the whole group goes back to what git HEAD has and the rest of the refresh stays. Restoring one group can
make another inconsistent (a fight's statistics without the fight), so the check runs again until nothing more can be restored.
Whatever is still wrong then is reported by the validation, which keeps the refresh from being committed.

update_all only does this inside GitHub Actions: on a computer it would throw away work that is not committed.
"""

from __future__ import annotations

import os
import subprocess
from collections.abc import Callable

from scripts.validate_data import ORG_DIRS

RAW = "data/raw"
ESPN = "espn"
GROUPS: dict[str, list[str]] = {
    # The saved picks go with the results that settled them: a broken refresh may have settled them wrongly.
    ESPN: [
        f"{RAW}/{name}"
        for name in (
            "events.csv", "fights.csv", "event_cards.csv", "upcoming_events.csv", "fighters.csv", "fight_details.csv",
            "espn_athletes.csv", "fighter_career_stats.csv", "prediction_log.csv",
        )
    ],
    "fight_stats": [f"{RAW}/fight_stats.csv", f"{RAW}/fight_stats_unmatched.csv"],
    "rankings": [f"{RAW}/rankings.csv"],
    "photos": [f"{RAW}/fighter_photos.csv", "frontend/public/fighter-photos"],
    "gyms": [f"{RAW}/gyms.csv", f"{RAW}/gym_fighters.csv"],
    **{org: [f"{RAW}/{org}"] for org in ORG_DIRS},
}


def group_of(problem: str) -> str | None:
    """The group a validation problem is about, or None when it is about a file written by hand."""
    label = problem.split(":", 1)[0].strip()
    if label == "fighter-photos":
        return "photos"
    if "/" in label:
        org = label.split("/", 1)[0]
        return org if org in GROUPS else None
    return next((group for group, paths in GROUPS.items() if f"{RAW}/{label}" in paths), None)


def in_github_actions() -> bool:
    return os.environ.get("GITHUB_ACTIONS") == "true"


def restore(paths: list[str]) -> None:
    """Back to what git HEAD has. Files that are not in HEAD (a photo downloaded today) are left alone."""
    tracked = subprocess.run(["git", "ls-tree", "-r", "--name-only", "HEAD", "--", *paths], capture_output=True, text=True, check=True).stdout
    known = [path for path in paths if any(line == path or line.startswith(f"{path}/") for line in tracked.splitlines())]
    if known:
        subprocess.run(["git", "restore", "--source=HEAD", "--worktree", "--", *known], check=True)


def quarantine(validate: Callable[[], list[str]], restore_paths: Callable[[list[str]], None] = restore) -> dict[str, list[str]]:
    """Restores every group with a problem. Returns the problems that sent each one back, by group."""
    restored: dict[str, list[str]] = {}
    while True:
        found: dict[str, list[str]] = {}
        for problem in validate():
            group = group_of(problem)
            if group is not None and group not in restored:
                found.setdefault(group, []).append(problem)
        if not found:
            return restored
        for group, problems in found.items():
            restore_paths(GROUPS[group])
            restored[group] = problems
