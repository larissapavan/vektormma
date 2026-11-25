"""When each source was last refreshed."""

from datetime import datetime, timezone

from scripts.refresh_status import update_status

DAY_1 = datetime(2026, 11, 1, 7, tzinfo=timezone.utc)
DAY_2 = datetime(2026, 11, 2, 7, tzinfo=timezone.utc)
DAY_3 = datetime(2026, 11, 3, 7, tzinfo=timezone.utc)


def test_a_success_is_dated_and_a_failure_keeps_the_last_one(tmp_path):
    path = tmp_path / "status.json"
    update_status({"espn": True, "gyms": True}, path, DAY_1)
    status = update_status({"espn": True, "gyms": False}, path, DAY_2)
    assert status["espn"] == {"last_success": DAY_2.isoformat(), "failing_since": None}
    assert status["gyms"] == {"last_success": DAY_1.isoformat(), "failing_since": DAY_2.isoformat()}

    status = update_status({"gyms": False}, path, DAY_3)
    assert status["gyms"]["failing_since"] == DAY_2.isoformat()  # since the first failure, not the last
    assert status["espn"]["last_success"] == DAY_2.isoformat()  # not run: what it had
    assert update_status({"gyms": True}, path, DAY_3)["gyms"] == {"last_success": DAY_3.isoformat(), "failing_since": None}


def test_a_skipped_step_and_a_source_that_never_worked(tmp_path):
    path = tmp_path / "status.json"
    status = update_status({"espn": None, "pfl": False}, path, DAY_1)
    assert status == {"pfl": {"last_success": None, "failing_since": DAY_1.isoformat()}}


def test_a_damaged_file_is_written_again(tmp_path):
    path = tmp_path / "status.json"
    path.write_text("{", encoding="utf-8")
    assert "espn" in update_status({"espn": True}, path, DAY_1)
