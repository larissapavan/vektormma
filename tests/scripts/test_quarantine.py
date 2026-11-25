"""A source whose refresh came out broken is put back without touching the others."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from scripts import quarantine


@pytest.mark.parametrize(
    ("problem", "group"),
    [
        ("gym_fighters.csv: rows dropped from 2914 to 1959", "gyms"),
        ("rankings.csv: only 2 rows (minimum 100)", "rankings"),
        ("fighter-photos: 11 photos shrank to under 30%", "photos"),
        ("ksw/fights.csv: KSW 99: a bout is missing a fighter", "ksw"),
        ("prediction_log.csv: the saved pick x is gone", "espn"),
        ("fight_stats.csv: url has 1 rows, not one per fighter", "fight_stats"),
        ("cancelled_fights.csv: missing or repeated id ('')", None),
        ("something else went wrong", None),
    ],
)
def test_the_problem_says_which_group_goes_back(problem, group):
    assert quarantine.group_of(problem) == group


def test_only_the_broken_group_goes_back():
    broken = {"gyms.csv: a gym has no name (x)"}
    restored = []

    def restore(paths):
        restored.extend(paths)
        broken.clear()

    assert quarantine.quarantine(lambda: sorted(broken), restore) == {"gyms": ["gyms.csv: a gym has no name (x)"]}
    assert restored == quarantine.GROUPS["gyms"]


def test_a_group_that_becomes_inconsistent_goes_back_too():
    rounds = iter([["fights.csv: rows dropped"], ["fight_stats.csv: x is not a fight in event_cards.csv"], []])
    assert list(quarantine.quarantine(lambda: next(rounds), lambda paths: None)) == ["espn", "fight_stats"]


def test_what_cannot_be_put_back_is_left_for_the_validation_to_report():
    problems = ["cancelled_fights.csv: bad row", "gyms.csv: still wrong after going back"]
    assert list(quarantine.quarantine(lambda: problems, lambda paths: None)) == ["gyms"]  # and it ends


def git(*args, cwd):
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True)


def test_restore_puts_back_tracked_files_and_leaves_new_ones(tmp_path, monkeypatch):
    git("init", "-q", cwd=tmp_path)
    git("config", "user.email", "t@example.test", cwd=tmp_path)
    git("config", "user.name", "t", cwd=tmp_path)
    folder = tmp_path / "data" / "raw" / "ksw"
    folder.mkdir(parents=True)
    (folder / "fights.csv").write_text("good", encoding="utf-8")
    other = tmp_path / "data" / "raw" / "gyms.csv"
    other.write_text("old", encoding="utf-8")
    git("add", ".", cwd=tmp_path)
    git("commit", "-qm", "x", cwd=tmp_path)
    (folder / "fights.csv").write_text("broken", encoding="utf-8")
    (folder / "new.csv").write_text("new", encoding="utf-8")
    other.write_text("refreshed", encoding="utf-8")

    monkeypatch.chdir(tmp_path)
    quarantine.restore(["data/raw/ksw", "data/raw/never_committed.csv"])
    assert (folder / "fights.csv").read_text(encoding="utf-8") == "good"
    assert (folder / "new.csv").exists()
    assert other.read_text(encoding="utf-8") == "refreshed"


def test_every_path_that_is_put_back_exists():
    root = Path(__file__).parents[2]
    missing = [path for paths in quarantine.GROUPS.values() for path in paths if not (root / path).exists()]
    assert missing == []
