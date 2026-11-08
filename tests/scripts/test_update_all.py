from datetime import date

import pytest

from scripts import update_all


@pytest.fixture(autouse=True)
def generated_pages(monkeypatch):
    """The two generators at the end of the update write tracked files (frontend/src/seo/athletes.json and the share images
    under frontend/public/og), and they have no skip flag, so every full run reaches them: no test of the update may run them
    for real. What they were asked to do is recorded here, apart from `calls`, whose exact contents the other tests assert."""
    log: list[str] = []
    monkeypatch.setattr(update_all.build_seo_athletes, "main", lambda: log.append("seo") or True)
    monkeypatch.setattr(update_all.build_og_images, "main", lambda: log.append("og") or True)
    return log


@pytest.fixture
def calls(monkeypatch):
    log: list[tuple[str, object]] = []
    monkeypatch.setattr(update_all.scrape_espn, "main", lambda argv=None: log.append(("espn", list(argv or []))))
    monkeypatch.setattr(update_all.scrape_fight_stats, "main", lambda argv=None: log.append(("stats", list(argv or []))))
    monkeypatch.setattr(update_all.scrape_rankings, "main", lambda: log.append(("rankings", None)))
    monkeypatch.setattr(update_all.download_fighter_photos, "main", lambda argv=None: log.append(("photos", list(argv or []))))
    monkeypatch.setattr(update_all.scrape_fighter_origins, "main", lambda argv=None: log.append(("origins", list(argv or []))))
    monkeypatch.setattr(update_all.scrape_roster_watch, "main", lambda: log.append(("roster", None)))
    monkeypatch.setattr(update_all.scrape_stat_leaders, "main", lambda: log.append(("records", None)))
    monkeypatch.setattr(update_all.scrape_pfl, "main", lambda argv=None: log.append(("pfl", list(argv or []))) or 0)
    monkeypatch.setattr(update_all.scrape_ufc_career_stats, "main", lambda argv=None: log.append(("career", list(argv or []))) or 0)
    monkeypatch.setattr(update_all.scrape_one, "main", lambda argv=None: log.append(("one", list(argv or []))) or 0)
    monkeypatch.setattr(update_all.scrape_gyms, "main", lambda argv=None: log.append(("gyms", list(argv or []))) or 0)
    monkeypatch.setattr(update_all.scrape_espn_org, "main", lambda argv=None: log.append(("espn_orgs", list(argv or []))) or 0)
    monkeypatch.setattr(update_all.scrape_oktagon, "main", lambda argv=None: log.append(("oktagon", list(argv or []))) or 0)
    monkeypatch.setattr(update_all.scrape_sherdog_org, "main", lambda argv=None: log.append(("sherdog", list(argv or []))) or 0)
    monkeypatch.setattr(update_all.log_predictions, "log_upcoming", lambda: log.append(("log", None)) or 0)
    monkeypatch.setattr(update_all.log_predictions, "resolve", lambda: log.append(("settle", None)) or 0)
    return log


def test_logs_picks_before_espn_and_settles_them_after(calls):
    assert update_all.main([]) == 0
    assert [name for name, _ in calls] == ["log", "espn", "settle", "stats", "rankings", "photos", "origins", "roster", "records", "career", "pfl", "one", "espn_orgs", "oktagon", "sherdog", "gyms"]


def test_dry_run_only_previews_the_espn_pfl_and_one_steps(calls):
    assert update_all.main(["--dry-run", "--since", "2026-09-01"]) == 0
    assert calls == [
        ("espn", ["--dry-run", "--since", "2026-09-01"]), ("pfl", ["--dry-run"]), ("one", ["--dry-run"]),
        ("espn_orgs", ["all", "--recent-days", "--dry-run"]), ("oktagon", ["--dry-run"]), ("sherdog", ["daily", "--dry-run"]), ("gyms", ["--dry-run"]),
    ]


def test_skip_flags_are_respected(calls):
    update_all.main(["--skip-espn", "--skip-photos", "--skip-origins", "--skip-roster", "--skip-records", "--skip-predictions", "--skip-stats", "--skip-career-stats", "--skip-pfl", "--skip-one", "--skip-espn-orgs", "--skip-oktagon", "--skip-sherdog", "--skip-gyms"])
    assert [name for name, _ in calls] == ["rankings"]


def test_a_failing_step_does_not_stop_the_others_and_sets_exit_status(monkeypatch, calls, capsys):
    def boom(argv=None):
        raise RuntimeError("ESPN down")

    monkeypatch.setattr(update_all.scrape_espn, "main", boom)
    assert update_all.main([]) == 1
    assert [name for name, _ in calls] == ["log", "settle", "stats", "rankings", "photos", "origins", "roster", "records", "career", "pfl", "one", "espn_orgs", "oktagon", "sherdog", "gyms"]
    assert "FAILED" in capsys.readouterr().out


def test_the_daily_update_collects_statistics_only_for_the_last_month(calls):
    update_all.main(["--skip-espn", "--skip-rankings", "--skip-photos", "--skip-origins", "--skip-roster", "--skip-records", "--skip-predictions"])
    [(name, args)] = [c for c in calls if c[0] == "stats"]
    assert args[0] == "--since" and (date.today() - date.fromisoformat(args[1])).days == update_all.FIGHT_STATS_DAYS


def test_a_dry_run_collects_no_statistics(calls):
    update_all.main(["--dry-run"])
    assert "stats" not in [name for name, _ in calls]


def test_the_pfl_step_downloads_photos_unless_photos_are_skipped(calls):
    update_all.main(["--skip-espn", "--skip-rankings", "--skip-origins", "--skip-roster", "--skip-records", "--skip-predictions", "--skip-stats", "--skip-photos"])
    assert ("pfl", []) in calls

    calls.clear()
    update_all.main(["--skip-espn", "--skip-rankings", "--skip-origins", "--skip-roster", "--skip-records", "--skip-predictions", "--skip-stats"])
    assert ("pfl", ["--photos"]) in calls


def test_a_pfl_scraper_that_finds_nothing_fails_the_run(monkeypatch, calls, capsys):
    monkeypatch.setattr(update_all.scrape_pfl, "main", lambda argv=None: 1)
    assert update_all.main(["--skip-espn", "--skip-rankings", "--skip-photos", "--skip-origins", "--skip-roster", "--skip-records", "--skip-predictions", "--skip-stats"]) == 1
    assert "PFL (pflmma.com): FAILED" in capsys.readouterr().out


def test_an_one_scraper_that_finds_nothing_fails_the_run(monkeypatch, calls, capsys):
    monkeypatch.setattr(update_all.scrape_one, "main", lambda argv=None: 1)
    assert update_all.main(["--skip-espn", "--skip-rankings", "--skip-photos", "--skip-origins", "--skip-roster", "--skip-records", "--skip-predictions", "--skip-stats", "--skip-pfl"]) == 1
    assert "ONE (onefc.com): FAILED" in capsys.readouterr().out


def test_a_career_stats_run_that_reads_no_page_fails_the_run(monkeypatch, calls, capsys):
    monkeypatch.setattr(update_all.scrape_ufc_career_stats, "main", lambda argv=None: 1)
    assert update_all.main(["--skip-espn", "--skip-rankings", "--skip-photos", "--skip-origins", "--skip-roster", "--skip-records", "--skip-predictions", "--skip-stats", "--skip-pfl", "--skip-one"]) == 1
    assert "UFC career stats: FAILED" in capsys.readouterr().out


def test_a_dry_run_skips_the_slow_career_stats_step(calls):
    update_all.main(["--dry-run"])
    assert "career" not in [name for name, _ in calls]


def test_a_gym_scraper_that_finds_nothing_fails_the_run(monkeypatch, calls, capsys):
    monkeypatch.setattr(update_all.scrape_gyms, "main", lambda argv=None: 1)
    assert update_all.main(["--skip-espn", "--skip-rankings", "--skip-photos", "--skip-origins", "--skip-roster", "--skip-records", "--skip-predictions", "--skip-stats", "--skip-pfl"]) == 1
    assert "Gyms (FightHub): FAILED" in capsys.readouterr().out


def test_the_daily_update_refreshes_the_other_organizations_with_their_incremental_modes(calls):
    update_all.main(["--skip-espn", "--skip-rankings", "--skip-photos", "--skip-origins", "--skip-roster", "--skip-records", "--skip-predictions", "--skip-stats", "--skip-career-stats", "--skip-pfl", "--skip-one", "--skip-gyms"])
    assert calls == [("espn_orgs", ["all", "--recent-days"]), ("oktagon", []), ("sherdog", ["daily"])]


@pytest.mark.parametrize(
    ("module", "label"),
    [("scrape_espn_org", "ESPN leagues (LFA, Cage Warriors)"), ("scrape_oktagon", "OKTAGON (oktagonmma.com)"), ("scrape_sherdog_org", "Sherdog (Jungle Fight, Invicta, KSW, RIZIN, LFA)")],
)
def test_a_failing_organization_step_fails_the_run_but_not_the_others(monkeypatch, calls, capsys, module, label):
    monkeypatch.setattr(getattr(update_all, module), "main", lambda argv=None: 1)
    assert update_all.main(["--skip-espn", "--skip-rankings", "--skip-photos", "--skip-origins", "--skip-roster", "--skip-records", "--skip-predictions", "--skip-stats", "--skip-career-stats"]) == 1
    captured = capsys.readouterr()
    assert f"{label}: FAILED" in captured.out and "Gyms (FightHub): ok" in captured.out  # the steps after it still ran
    assert "RuntimeError" in captured.err  # and the reason is in the log


@pytest.mark.parametrize("flag", ["--skip-espn-orgs", "--skip-oktagon", "--skip-sherdog"])
def test_each_organization_step_can_be_skipped_on_its_own(calls, flag):
    update_all.main(["--skip-espn", "--skip-rankings", "--skip-photos", "--skip-origins", "--skip-roster", "--skip-records", "--skip-predictions", "--skip-stats", "--skip-career-stats", "--skip-pfl", "--skip-one", "--skip-gyms", flag])
    assert len(calls) == 2


def test_a_failed_step_is_recorded_with_its_reason():
    update_all.FAILURES.clear()

    def broken():
        raise RuntimeError("the gym scraper found nothing")

    assert update_all.run_step("Gyms (FightHub)", broken) is False
    assert update_all.FAILURES == {"Gyms (FightHub)": "RuntimeError: the gym scraper found nothing"}
    update_all.FAILURES.clear()


def test_github_gets_one_annotation_per_failed_step_with_the_special_characters_escaped():
    lines = update_all.github_annotations({"Sherdog (KSW)": "HTTPError: 403 100% blocked\nsecond line"})
    assert lines == ["::error title=Refresh step failed: Sherdog (KSW)::HTTPError: 403 100%25 blocked%0Asecond line"]


def test_the_run_summary_lists_the_failed_steps_in_a_table():
    text = update_all.github_step_summary({"Gyms (FightHub)": "RuntimeError: nothing\ntraceback detail"})
    assert "| Gyms (FightHub) | RuntimeError: nothing |" in text
    assert update_all.github_step_summary({}) == "All refresh steps finished.\n"


def test_nothing_is_written_outside_github_actions(monkeypatch, tmp_path, capsys):
    summary = tmp_path / "summary.md"
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    update_all.report_to_github({"Gyms (FightHub)": "RuntimeError: nothing"})
    assert not summary.exists() and capsys.readouterr().out == ""

    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    update_all.report_to_github({"Gyms (FightHub)": "RuntimeError: nothing"})
    assert "::error title=Refresh step failed: Gyms (FightHub)::RuntimeError: nothing" in capsys.readouterr().out
    assert "Gyms (FightHub)" in summary.read_text(encoding="utf-8")


def test_the_static_pages_are_built_after_the_scrapers_and_before_the_data_is_validated(monkeypatch, calls, generated_pages):
    monkeypatch.setattr(update_all, "require_valid", lambda: generated_pages.append("validate"))
    assert update_all.main([]) == 0
    assert calls[-1] == ("gyms", [])  # the gym scraper comes last of the scrapers
    # The share images are drawn from the data the first one writes, and the validation looks at what both produced.
    assert generated_pages == ["seo", "og", "validate"]


def test_a_dry_run_builds_no_pages(calls, generated_pages):
    update_all.main(["--dry-run"])
    assert generated_pages == []


def test_a_failing_page_generator_does_not_stop_the_next_step_and_sets_exit_status(monkeypatch, calls, generated_pages, capsys):
    def boom():
        raise RuntimeError("no athletes")

    monkeypatch.setattr(update_all, "require_valid", lambda: generated_pages.append("validate"))
    monkeypatch.setattr(update_all.build_seo_athletes, "main", boom)
    assert update_all.main([]) == 1
    assert generated_pages == ["og", "validate"]
    assert "SEO pages data" in capsys.readouterr().out
