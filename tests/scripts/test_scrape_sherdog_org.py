"""The Sherdog collector (Jungle Fight, Invicta FC), run against pages that copy the shape of Sherdog's event pages."""

from __future__ import annotations

import csv
from datetime import date

import pytest

from backend.app.services.org_service import ORGS as SITE_ORGS
from scripts import scrape_sherdog_org as sd
from scripts.scrape_pfl import FIGHT_FIELDS, FIGHTER_FIELDS, RANKING_FIELDS

JUNGLE, INVICTA = sd.ORGS["jungle-fight"], sd.ORGS["invicta"]


def fighter_block(side, name, ident, result, nickname=None):
    first, _, last = name.partition(" ")
    alt = f"{first} '{nickname}' {last}" if nickname else name
    outcome = f'<span class="final_result {result}">{result}</span>' if result else ""
    return (
        f'<div class="fighter {side}_side"><a href="/fighter/{name.replace(" ", "-")}-{ident}"><img alt="{alt}" src="/x.png"/></a>'
        f'<h3><a href="/fighter/{name.replace(" ", "-")}-{ident}"><span itemprop="name">{first}<br/>{last}</span></a></h3>'
        f'<span class="record">8-1-0</span>{outcome}</div>'
    )


def table_fighter(side, name, ident, result, nickname=None):
    first, _, last = name.partition(" ")
    alt = f"{first} '{nickname}' {last}" if nickname else name
    outcome = f'<br/><span class="final_result {result}">{result}</span>' if result else ""
    return (
        f'<div class="fighter_list {side}"><img alt="{alt}" src="/y.png"/><div class="fighter_result_data">'
        f'<a href="/fighter/{name.replace(" ", "-")}-{ident}"><span itemprop="name">{first}<br/>{last}</span></a>{outcome}</div></div>'
    )


def row(number, left, right, *, weight="Lightweight", title=False, method="Decision (Unanimous)", round_="3", time="5:00"):
    flag = '<span class="title_fight">TITLE FIGHT</span>' if title else ""
    return (
        f'<tr itemprop="subEvent"><td><meta content="x" itemprop="name"/>{number}</td>'
        f'<td class="text_right" itemprop="performer">{table_fighter("left", *left)}</td>'
        f'<td class="text_center">{flag}<br/><span class="weight_class">{weight}</span></td>'
        f'<td class="text_left" itemprop="performer">{table_fighter("right", *right)}</td>'
        f'<td class="winby"><b>{method}</b><br/><span class="sub_line"><a href="/referee/Ref-1">Ref Eree</a></span></td><td>{round_}</td><td>{time}</td></tr>'
    )


ANA, BIA, CAL, DAN, EVA, FAY = (("Ana One", 1, "win"), ("Bia Two", 2, "loss"), ("Cal Three", 3, "win"), ("Dan Four", 4, "loss"), ("Eva Five", 5, "win"), ("Fay Six", 6, "loss"))


def page(*rows, org="Jungle Fight", day="2024-03-16", title="Jungle Fight 99", main=None, location="Arena, Manaus, Amazonas, Brazil"):
    main_html = ""
    if main:
        (lname, lid, lres), (rname, rid, rres), weight, belt, method, rnd, clock = main
        flag = '<span class="title_fight">TITLE FIGHT</span>' if belt else ""
        main_html = (
            f'<div class="fight_card">{fighter_block("left", lname, lid, lres)}<div class="versus"><b>MAIN EVENT</b>{flag}<br/>'
            f'<span class="weight_class">{weight}</span></div>{fighter_block("right", rname, rid, rres)}</div>'
            f'<table class="fight_card_resume"><tr><td><em>Match</em><br/>14</td><td><em>Method</em><br/>{method}</td>'
            f'<td><em>Referee</em><br/><a href="/referee/R-1">R</a></td><td><em>Round</em><br/>{rnd}</td><td><em>Time</em><br/>{clock}</td></tr></table>'
        )
    table = f'<table class="new_table result"><tr><th>Match</th></tr>{"".join(rows)}</table>' if rows else ""
    return (
        f'<html><body><div class="event_detail"><div><h1><span itemprop="name">{title}</span></h1>'
        f'<div class="organization"><a href="/organizations/X-1"><span itemprop="name">{org}</span></a></div>'
        f'<div class="info"><span><meta content="{day}T00:00:00+00:00" itemprop="startDate"/>Mar 16, 2024</span>'
        f'<span><span itemprop="location">{location}</span></span></div></div></div>{main_html}{table}</body></html>'
    )


URL = "https://www.sherdog.com/events/Jungle-Fight-99-Test-5"


def test_each_organization_is_registered_on_the_site_with_the_folder_it_writes_to():
    for org in sd.ORGS.values():
        assert org.id in SITE_ORGS and SITE_ORGS[org.id].data_dir.name == org.id


def test_the_events_of_an_organization_are_the_sitemap_addresses_that_start_with_its_prefix():
    xml = """<urlset>
      <url><loc>https://www.sherdog.com/events/Jungle-Fight-1-Manaus-1812</loc></url>
      <url><loc>https://www.sherdog.com/events/Jungle-Fight-1-Manaus-1812</loc></url>
      <url><loc>https://www.sherdog.com/events/UFC-1-The-Beginning-7</loc></url>
      <url><loc>https://www.sherdog.com/events/Invicta-FC-1-Coenen-vs-Ruyssen-20545</loc></url>
    </urlset>"""
    assert sd.event_urls(xml, "Jungle-Fight") == ["https://www.sherdog.com/events/Jungle-Fight-1-Manaus-1812"]
    assert sd.event_urls(xml, "Invicta") == ["https://www.sherdog.com/events/Invicta-FC-1-Coenen-vs-Ruyssen-20545"]


def test_an_event_has_its_name_date_place_and_the_main_event_first():
    html = page(row(13, CAL, DAN), main=(ANA, BIA, "Strawweight", True, "TKO (Doctor Stoppage)", "4", "5:00"))
    event = sd.parse_event(html, URL, JUNGLE)
    assert (event["name"], event["day"], event["location"], event["id"]) == ("Jungle Fight 99", date(2024, 3, 16), "Arena, Manaus, Amazonas, Brazil", "5")
    main, other = event["bouts"]
    assert (main["fighter_1"]["name"], main["fighter_2"]["name"], main["winner"], main["weight_class"], main["title_fight"]) == ("Ana One", "Bia Two", "Ana One", "Strawweight", True)
    assert (main["method"], main["method_detail"], main["round"], main["time"]) == ("KO/TKO", "Doctor Stoppage", "4", "5:00")
    assert (other["winner"], other["title_fight"]) == ("Cal Three", False)


def test_the_table_rows_give_winner_division_method_round_and_time():
    event = sd.parse_event(page(row(2, CAL, DAN, weight="Welterweight", method="Submission (Rear-Naked Choke)", round_="2", time="0:30"), row(1, EVA, FAY)), URL, JUNGLE)
    first, second = event["bouts"]
    assert (first["winner"], first["weight_class"], first["method"], first["method_detail"], first["round"], first["time"]) == ("Cal Three", "Welterweight", "SUB", "Rear-Naked Choke", "2", "0:30")
    assert (second["method"], second["method_detail"]) == ("U-DEC", "")  # a decision says which one, not a technique


@pytest.mark.parametrize(
    ("text", "code"),
    [
        ("Decision (Unanimous)", "U-DEC"), ("Decision (Split)", "S-DEC"), ("Decision (Majority)", "M-DEC"), ("Decision", "DEC"),
        ("KO (Punches)", "KO/TKO"), ("TKO (Doctor Stoppage)", "KO/TKO"), ("Submission (Armbar)", "SUB"), ("DQ (Illegal Knee)", "DQ"),
    ],
)
def test_the_method_is_written_like_the_ufc_data(text, code):
    assert sd.method_of(text)[0] == code


def test_a_card_with_draws_and_no_contests_marks_them_the_way_the_fighter_history_counts_them():
    drawn = (("Ana One", 1, "draw"), ("Bia Two", 2, "draw"))
    voided = (("Cal Three", 3, "nc"), ("Dan Four", 4, "nc"))
    event = sd.parse_event(page(row(2, *drawn, method="Decision (Majority)"), row(1, *voided, method="NC (Accidental Eye Poke)")), URL, JUNGLE)
    draw, no_contest = event["bouts"]
    assert (draw["outcome"], draw["method"], draw["winner"]) == ("draw", "Draw", "")
    assert (no_contest["outcome"], no_contest["method"], no_contest["winner"]) == ("no_contest", "NO CONTEST", "")


def test_a_card_to_come_has_no_results():
    to_come = (("Ana One", 1, ""), ("Bia Two", 2, ""))
    event = sd.parse_event(page(row(1, *to_come, method="", round_="", time="")), URL, JUNGLE)
    [bout] = event["bouts"]
    assert (bout["outcome"], bout["winner"], bout["method"], bout["round"], bout["time"]) == ("", "", "", "", "")


def test_another_promoters_event_or_a_page_without_a_card_is_not_taken():
    assert sd.parse_event(page(row(1, ANA, BIA), org="Invicta Fighting Championships"), URL, JUNGLE) is None
    assert sd.parse_event(page(row(1, ANA, BIA), org="Jungle Fight 2"), URL, JUNGLE) is None
    assert sd.parse_event(page(), URL, JUNGLE) is None
    assert sd.parse_event("<html>nothing</html>", URL, JUNGLE) is None


@pytest.mark.parametrize(
    ("label", "womens", "expected"),
    [
        ("Lightweight", False, "Lightweight"), ("Catchweight", False, "Catch Weight"), ("150lb Catchweight", False, "Catch Weight"),
        ("Strawweight", False, "Strawweight"), ("Bantamweight", True, "Women's Bantamweight"), ("Catchweight", True, "Catch Weight"), ("", False, ""),
    ],
)
def test_the_division_is_the_ufc_name_and_an_all_women_promotion_says_so(label, womens, expected):
    assert sd.division(label, womens) == expected


def test_invicta_is_marked_as_a_womens_promotion_and_jungle_fight_is_not():
    assert INVICTA.womens and not JUNGLE.womens
    event = sd.parse_event(page(row(1, ANA, BIA, weight="Bantamweight"), org="Invicta Fighting Championships"), URL, INVICTA)
    assert event["bouts"][0]["weight_class"] == "Women's Bantamweight"


def test_rows_name_the_organization_flag_the_title_bout_and_keep_card_order():
    event = sd.parse_event(page(row(1, CAL, DAN), main=(ANA, BIA, "Strawweight", True, "KO (Punch)", "1", "0:10")), URL, JUNGLE)
    rows = sd.fight_rows([event], JUNGLE)
    assert [r["card_order"] for r in rows] == [0, 1] and [r["fighter_1"] for r in rows] == ["Ana One", "Cal Three"]
    assert (rows[0]["title_fight"], rows[0]["stage"], rows[1]["title_fight"]) == ("true", "Title Fight", "")
    assert all(r["event_slug"] == "jungle-fight-5" and r["event_url"] == URL for r in rows)
    assert rows[0]["fighter_1_url"] == "https://www.sherdog.com/fighter/Ana-One-1"


def test_fighters_have_a_profile_nickname_usual_division_and_only_the_dates_of_fights_had():
    old = sd.parse_event(page(row(1, (("Ana One", 1, "win")), BIA, weight="Lightweight"), day="2019-01-01"), URL, JUNGLE)
    old["id"] = "1"
    new_row = row(1, (("Ana One", 1, "", "The Arm")), (("Cal Three", 3, "")), weight="Lightweight", method="", round_="", time="")
    coming = sd.parse_event(page(new_row, day="2099-01-01"), URL, JUNGLE)
    recent = sd.parse_event(page(row(1, (("Dan Four", 4, "win")), (("Eva Five", 5, "loss")), weight="Welterweight"), day="2026-06-01"), URL, JUNGLE)
    events = [coming, recent, old]
    fights = sd.fight_rows(events, JUNGLE)
    rows = {r["name"]: r for r in sd.fighter_rows(events, fights, date(2026, 11, 2))}
    ana = rows["Ana One"]
    assert (ana["profile_url"], ana["nickname"], ana["weight_class"], ana["first_fight_date"], ana["last_fight_date"]) == ("https://www.sherdog.com/fighter/Ana-One-1", "The Arm", "Lightweight", "2019-01-01", "2019-01-01")
    assert ana["country"] == "" and ana["career_record"] == "" and ana["age"] == ""  # not on the event page: nothing is guessed
    assert (ana["status"], rows["Dan Four"]["status"], rows["Cal Three"]["status"]) == ("inactive", "active", "inactive")


class FakeFetcher:
    def __init__(self, pages):
        self.pages = pages

    def get(self, url):
        return self.pages.get(url)


def sitemap(*slugs):
    return "<urlset>" + "".join(f"<url><loc>https://www.sherdog.com/events/{slug}</loc></url>" for slug in slugs) + "</urlset>"


def read(path):
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def test_a_run_writes_the_three_files_and_skips_what_is_not_the_organizations(tmp_path, monkeypatch):
    monkeypatch.setattr(sd, "RAW_DATA_DIR", tmp_path)
    pages = {
        "https://www.sherdog.com/events/Jungle-Fight-1-A-1": page(row(1, ANA, BIA), day="2010-01-01"),
        "https://www.sherdog.com/events/Jungle-Fight-2-B-2": page(row(1, CAL, DAN), day="2011-01-01"),
        "https://www.sherdog.com/events/Jungle-Fight-Korea-3": page(row(1, EVA, FAY), org="Some Korean Promoter"),
    }
    sitemaps = [sitemap("Jungle-Fight-1-A-1", "Jungle-Fight-2-B-2", "Jungle-Fight-Korea-3")]
    assert sd.collect(JUNGLE, FakeFetcher(pages), sitemaps, dry_run=False) == 0
    folder = tmp_path / "jungle-fight"
    fights, fighters = read(folder / "fights.csv"), read(folder / "fighters.csv")
    assert list(fights[0]) == FIGHT_FIELDS and list(fighters[0]) == FIGHTER_FIELDS
    assert [r["event_date"] for r in fights] == ["2011-01-01", "2010-01-01"]  # newest first; the Korean promoter's event is not here
    assert sorted(r["name"] for r in fighters) == ["Ana One", "Bia Two", "Cal Three", "Dan Four"]
    assert (folder / "rankings.csv").read_text(encoding="utf-8").strip() == ",".join(RANKING_FIELDS)


def test_a_dry_run_writes_nothing_and_no_events_is_an_error_that_leaves_the_files_alone(tmp_path, monkeypatch):
    monkeypatch.setattr(sd, "RAW_DATA_DIR", tmp_path)
    pages = {"https://www.sherdog.com/events/Jungle-Fight-1-A-1": page(row(1, ANA, BIA))}
    assert sd.collect(JUNGLE, FakeFetcher(pages), [sitemap("Jungle-Fight-1-A-1")], dry_run=True) == 0 and not (tmp_path / "jungle-fight").exists()
    (tmp_path / "jungle-fight").mkdir()
    (tmp_path / "jungle-fight" / "fights.csv").write_text("keep me", encoding="utf-8")
    assert sd.collect(JUNGLE, FakeFetcher({}), [sitemap("Jungle-Fight-1-A-1")], dry_run=False) == 1
    assert (tmp_path / "jungle-fight" / "fights.csv").read_text(encoding="utf-8") == "keep me"


def test_the_command_line_takes_one_organization_or_all_and_fails_if_the_sitemaps_cannot_be_read(monkeypatch):
    ran = []
    monkeypatch.setattr(sd, "Fetcher", lambda delay, cache_dir, user_agent: FakeFetcher({url: "<urlset></urlset>" for url in sd.SITEMAPS}))
    monkeypatch.setattr(sd, "collect", lambda org, fetcher, sitemaps, dry_run, recent_days=None: ran.append((org.id, recent_days)) or 0)
    assert sd.main(["invicta", "--dry-run"]) == 0 and ran == [("invicta", None)]
    ran.clear()
    assert sd.main(["all", "--dry-run"]) == 0 and ran == [("jungle-fight", None), ("invicta", None)]
    ran.clear()
    assert sd.main(["daily", "--dry-run"]) == 0 and ran == [(org, sd.RECENT_DAYS) for org in ("jungle-fight", "invicta", "ksw", "rizin", "lfa")]  # all five, the recent window
    ran.clear()
    assert sd.main(["ksw", "--recent-days", "10"]) == 0 and ran == [("ksw", 10)]
    monkeypatch.setattr(sd, "Fetcher", lambda delay, cache_dir, user_agent: FakeFetcher({}))
    assert sd.main(["all", "--dry-run"]) == 1
    with pytest.raises(SystemExit):
        sd.main(["oktagon"])  # OKTAGON has its own collector


# --------------------------------------------------------------------------- adding to the files another source wrote (KSW, RIZIN)

KSW = sd.SherdogOrg("ksw", ("KSW-",), "Konfrontacja Sztuk Walki", since=date(2025, 1, 1))
TODAY = date(2026, 11, 2)


def espn_fight(slug, day, one, two, *, winner="", division="Lightweight", order=0):
    row = {field: "" for field in FIGHT_FIELDS}
    row.update(
        event_name=f"KSW {slug}", event_date=day, location="Warsaw, Poland", event_url=f"https://www.espn.com/{slug}", event_slug=f"ksw-{slug}",
        fight_url=f"https://www.espn.com/{slug}#fight-{order}", card_order=str(order), fighter_1=one, fighter_2=two,
        fighter_1_url=f"https://www.espn.com/mma/fighter/_/id/{one[:3]}", fighter_2_url=f"https://www.espn.com/mma/fighter/_/id/{two[:3]}",
        winner=winner, outcome="win" if winner else "", weight_class=division, method="KO/TKO" if winner else "",
    )
    return row


def espn_fighter(name, **values):
    row = {field: "" for field in FIGHTER_FIELDS}
    row.update(name=name, slug=name.lower().replace(" ", "-"), profile_url=f"https://www.espn.com/mma/fighter/_/id/{name[:3]}", status="inactive", country="Poland")
    row.update(values)
    return row


def base():
    fights = [
        espn_fight("old", "2024-12-20", "Ana One", "Bia Two", winner="Ana One"),
        espn_fight("women", "2024-11-16", "Gia Seven", "Hana Eight", winner="Gia Seven", division="Women's Strawweight"),
    ]
    fighters = [espn_fighter("Ana One", last_fight_date="2024-12-20"), espn_fighter("Bia Two", last_fight_date="2024-12-20"), espn_fighter("Gia Seven"), espn_fighter("Hana Eight")]
    return fights, fighters


def sd_event(*rows, day="2025-03-08", title="KSW 104", ident="777"):
    return sd.parse_event(page(*rows, org="Konfrontacja Sztuk Walki", day=day, title=title), f"https://www.sherdog.com/events/KSW-104-X-{ident}", KSW)


def test_the_new_events_are_added_to_the_other_sources_rows_which_are_left_exactly_as_they_were():
    fights, fighters = base()
    before = [dict(row) for row in fights]
    event = sd_event(row(2, CAL, DAN), row(1, EVA, FAY))
    combined, people, report = sd.supplement(KSW, [event], fights, fighters, TODAY)
    assert [r for r in combined if "sherdog" not in r["event_slug"]] == before  # every ESPN row, untouched and in its order
    new = [r for r in combined if "sherdog" in r["event_slug"]]
    assert [r["fighter_1"] for r in new] == ["Cal Three", "Eva Five"] and {r["event_slug"] for r in new} == {"ksw-sherdog-777"}
    assert [r["event_date"] for r in combined] == ["2025-03-08", "2025-03-08", "2024-12-20", "2024-11-16"]  # newest first
    assert report["new_bouts"] == 2 and report["new_people"] == 4


def test_an_event_before_the_start_day_is_not_added_and_one_the_files_already_have_is_skipped():
    fights, fighters = base()
    too_old = sd_event(row(1, CAL, DAN), day="2024-06-01", ident="1")
    same_card = sd_event(row(1, ANA, BIA), day="2024-12-21", ident="2")  # the card ESPN has, a day later in another time zone... but before `since`
    combined, _, report = sd.supplement(KSW, [too_old, same_card], fights, fighters, TODAY)
    assert len(combined) == len(fights) and report["new_bouts"] == 0

    after = sd_event(row(1, ANA, BIA), day="2025-01-02", ident="3")
    fights[0]["event_date"] = "2025-01-01"  # the other source does have a card from `since` on, and the same bout
    combined, _, report = sd.supplement(KSW, [after], fights, fighters, TODAY)
    assert report["skipped_overlap"] and report["new_bouts"] == 0 and len(combined) == len(fights)


def test_a_person_the_files_have_keeps_their_spelling_and_profile_and_a_winner_follows_the_rename():
    fights, fighters = base()
    fighters[0]["name"], fighters[0]["profile_url"] = "Ána-One", "https://www.espn.com/mma/fighter/_/id/ANA"  # how ESPN spells and links her
    fighters[0]["name"] = "Ana One"
    event = sd_event(row(1, ("Ana One", 1, "win"), CAL))
    combined, _, _ = sd.supplement(KSW, [event], fights, fighters, TODAY)
    [bout] = [r for r in combined if "sherdog" in r["event_slug"]]
    assert (bout["fighter_1"], bout["fighter_1_url"], bout["winner"]) == ("Ana One", "https://www.espn.com/mma/fighter/_/id/ANA", "Ana One")
    assert bout["fighter_2_url"] == "https://www.sherdog.com/fighter/Cal-Three-3"  # someone new keeps Sherdog's profile


def test_new_fighters_are_added_and_the_known_ones_only_get_newer_dates_and_an_active_status():
    fights, fighters = base()
    event = sd_event(row(1, ANA, CAL), day="2026-01-17", ident="9")
    combined, people, _ = sd.supplement(KSW, [event], fights, fighters, TODAY)
    by_name = {p["name"]: p for p in people}
    ana, bia = by_name["Ana One"], by_name["Bia Two"]
    assert (ana["last_fight_date"], ana["status"], ana["country"]) == ("2026-01-17", "active", "Poland")  # a newer fight: active, nothing else changed
    assert (bia["last_fight_date"], bia["status"]) == ("2024-12-20", "inactive")  # not on the new card: left alone
    assert by_name["Cal Three"]["profile_url"] == "https://www.sherdog.com/fighter/Cal-Three-3" and by_name["Cal Three"]["country"] == ""


def test_a_second_run_replaces_what_the_first_added_and_gives_the_same_files():
    fights, fighters = base()
    event = sd_event(row(1, CAL, DAN))
    first = sd.supplement(KSW, [event], fights, fighters, TODAY)
    second = sd.supplement(KSW, [event], first[0], first[1], TODAY)
    assert second[0] == first[0] and second[1] == first[1]
    corrected = sd_event(row(1, CAL, DAN, method="KO (Punches)"))  # the result was corrected on the site
    third, _, _ = sd.supplement(KSW, [corrected], first[0], first[1], TODAY)
    assert [r["method"] for r in third if "sherdog" in r["event_slug"]] == ["KO/TKO"]  # the earlier U-DEC is replaced, not kept beside it


def test_a_division_both_sexes_use_gets_women_s_when_a_woman_the_files_have_is_in_it_or_when_the_files_only_know_it_as_women_s():
    fights, fighters = base()
    known_woman = sd_event(row(2, ("Gia Seven", 7, "win"), CAL, weight="Bantamweight"), row(1, EVA, FAY, weight="Strawweight"), row(0, DAN, BIA, weight="Welterweight"), ident="5")
    combined, _, report = sd.supplement(KSW, [known_woman], fights, fighters, TODAY)
    divisions = {r["fighter_1"]: r["weight_class"] for r in combined if "sherdog" in r["event_slug"]}
    assert divisions == {"Gia Seven": "Women's Bantamweight", "Eva Five": "Women's Strawweight", "Dan Four": "Welterweight"}
    assert report["womens_fixed"] == 2


def test_names_that_look_alike_are_listed_for_review_but_never_merged():
    fights, fighters = base()
    fighters.append(espn_fighter("Marek Novacek"))
    event = sd_event(row(1, ("Marek Novacek Jr", 11, "win"), CAL))
    combined, people, report = sd.supplement(KSW, [event], fights, fighters, TODAY)
    assert report["possible_same"] == ["Marek Novacek Jr ~ Marek Novacek"]
    assert {"Marek Novacek Jr", "Marek Novacek"} <= {p["name"] for p in people}


def test_a_name_confirmed_as_the_same_person_is_merged_into_the_one_the_files_already_have(monkeypatch):
    monkeypatch.setitem(sd.SAME_PERSON, "ksw", {"Oleksii Polishchuk": "Oleksii Polischuck"})
    fights, fighters = base()
    fighters.append(espn_fighter("Oleksii Polischuck", last_fight_date="2024-01-20"))
    fights.append(espn_fight("older", "2024-01-20", "Oleksii Polischuck", "Dan Four", winner="Dan Four", order=1))
    event = sd_event(row(1, ("Oleksii Polishchuk", 11, "win"), CAL), day="2025-02-21", ident="21")
    combined, people, report = sd.supplement(KSW, [event], fights, fighters, TODAY)
    names = {p["name"] for p in people}
    assert "Oleksii Polischuck" in names and "Oleksii Polishchuk" not in names  # one profile, in the files' spelling
    [bout] = [r for r in combined if "sherdog" in r["event_slug"]]
    assert (bout["fighter_1"], bout["winner"], bout["fighter_1_url"]) == ("Oleksii Polischuck", "Oleksii Polischuck", "https://www.espn.com/mma/fighter/_/id/Ole")
    person = next(p for p in people if p["name"] == "Oleksii Polischuck")
    assert (person["first_fight_date"], person["last_fight_date"], person["status"]) == ("2024-01-20", "2025-02-21", "active")  # one history across both sources
    assert report["possible_same"] == []


def test_the_supplement_refuses_to_run_without_the_files_it_adds_to_and_all_leaves_it_out(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(sd, "RAW_DATA_DIR", tmp_path)
    assert sd.collect_supplement(KSW, [sd_event(row(1, CAL, DAN))], dry_run=False) == 1
    assert "no files to add to" in capsys.readouterr().out and not (tmp_path / "ksw").exists()
    assert sd.STANDALONE == ["jungle-fight", "invicta"] and "ksw" in sd.ORGS and "rizin" in sd.ORGS


def test_a_run_writes_the_combined_files_and_a_dry_run_writes_nothing(tmp_path, monkeypatch):
    from scripts.scrape_espn import save_csv

    monkeypatch.setattr(sd, "RAW_DATA_DIR", tmp_path)
    folder = tmp_path / "ksw"
    folder.mkdir()
    fights, fighters = base()
    save_csv(folder / "fights.csv", FIGHT_FIELDS, fights)
    save_csv(folder / "fighters.csv", FIGHTER_FIELDS, fighters)
    save_csv(folder / "rankings.csv", RANKING_FIELDS, [])
    before = (folder / "fights.csv").read_bytes()
    event = sd_event(row(1, CAL, DAN))
    assert sd.collect_supplement(KSW, [event], dry_run=True) == 0 and (folder / "fights.csv").read_bytes() == before
    assert sd.collect_supplement(KSW, [event], dry_run=False) == 0
    assert len(read(folder / "fights.csv")) == 3 and len(read(folder / "fighters.csv")) == 6
    assert sd.collect_supplement(KSW, [], dry_run=False) == 1  # no event from the start day on: an error, files kept
    assert len(read(folder / "fights.csv")) == 3


# --------------------------------------------------------------------------- the daily refresh


def test_the_refresh_reads_the_recent_known_events_and_the_unknown_ones_created_after_them():
    urls = [f"https://www.sherdog.com/events/KSW-{n}-X-{n}" for n in (100, 150, 160, 170, 180, 190)]
    known = {"150": "2025-01-10", "160": "2026-09-01", "170": "2026-10-20", "180": "2027-01-01"}  # id -> day; 100 is pre-2025 and was never wanted
    chosen = sd.select_recent(urls, known, date(2026, 11, 2), 45)
    # 160 (two months ago) and 150 (long ago) are known and past the window: not read. 170 is recent and 180 is announced: read.
    # 190 is unknown and newer than the oldest recent event: read. 100 is unknown but older: it is not an event the files want.
    assert [sd.event_id(url) for url in chosen] == ["170", "180", "190"]


def test_with_no_recent_event_in_the_files_the_refresh_still_catches_what_was_created_after_the_newest():
    urls = [f"https://www.sherdog.com/events/Invicta-FC-{n}-X-{n}" for n in (10, 20, 30)]
    chosen = sd.select_recent(urls, {"10": "2024-01-01", "20": "2025-05-16"}, date(2026, 11, 2), 45)  # a dormant organization
    # Nothing is recent, so only an id newer than the newest known (20) is read: 30. The known events are past the window.
    assert [sd.event_id(url) for url in chosen] == ["30"]


def test_the_ids_of_the_events_the_script_added_come_from_the_sherdog_address_of_its_rows_and_never_from_espns():
    rows = [
        {"fight_url": "https://www.sherdog.com/events/KSW-104-X-777#fight-0", "event_slug": "ksw-sherdog-777", "event_date": "2025-03-08"},
        {"fight_url": "https://www.sherdog.com/events/KSW-100-X-555#fight-3", "event_slug": "ksw-600059074", "event_date": "2024-11-16"},  # a bout added to ESPN's card
        {"fight_url": "https://www.espn.com/mma/fightcenter/_/id/600059074/league/ksw#fight-1", "event_slug": "ksw-600059074", "event_date": "2024-12-20"},
    ]
    assert sd.known_events(KSW, rows) == {"777": "2025-03-08", "555": "2024-11-16"}
    assert sd.known_events(JUNGLE, [{"fight_url": "https://www.sherdog.com/events/Jungle-Fight-5-X-5#fight-0", "event_slug": "jungle-fight-5", "event_date": "2024-03-16"}]) == {"5": "2024-03-16"}


def test_the_refresh_of_an_organization_another_source_also_writes_reads_its_newest_events_too():
    urls = [f"https://www.sherdog.com/events/LFA-{n}-X-{n}" for n in (100, 150, 160, 170, 180, 190)]
    known = {"170": "2026-10-20"}  # the only recent event the files know: 160 is older than it, so it would never be read
    assert [sd.event_id(url) for url in sd.select_recent(urls, known, date(2026, 11, 2), 45)] == ["170", "180", "190"]
    assert [sd.event_id(url) for url in sd.select_recent(urls, known, date(2026, 11, 2), 45, newest=4)] == ["160", "170", "180", "190"]


def test_an_incremental_supplement_replaces_only_the_events_read_and_keeps_every_other_row():
    fights, fighters = base()
    first = sd.supplement(KSW, [sd_event(row(1, CAL, DAN), day="2025-03-08", ident="777"), sd_event(row(1, EVA, FAY), day="2025-04-26", title="KSW 105", ident="888")], fights, fighters, TODAY)
    corrected = sd_event(row(1, CAL, DAN, method="KO (Punches)"), day="2025-03-08", ident="777")  # the result of one card was corrected
    combined, people, report = sd.supplement(KSW, [corrected], first[0], first[1], TODAY, incremental=True)
    assert [r["event_slug"] for r in combined] == [r["event_slug"] for r in first[0]]  # the same cards in the same order
    by_event = {r["event_slug"]: r for r in combined}
    assert by_event["ksw-sherdog-777"]["method"] == "KO/TKO"  # replaced
    assert by_event["ksw-sherdog-888"] == next(r for r in first[0] if r["event_slug"] == "ksw-sherdog-888")  # not read again: untouched
    assert [r for r in combined if "sherdog" not in r["event_slug"]] == fights  # and neither is ESPN's
    assert {p["name"] for p in people} == {p["name"] for p in first[1]} and report["new_people"] == 0


def test_a_card_created_after_the_last_run_is_added_to_the_files_it_finds():
    fights, fighters = base()
    first = sd.supplement(KSW, [sd_event(row(1, CAL, DAN), day="2025-03-08", ident="777")], fights, fighters, TODAY)
    newer = sd_event(row(1, EVA, FAY), day="2026-12-19", title="KSW 124", ident="999")
    combined, people, report = sd.supplement(KSW, [newer], first[0], first[1], TODAY, incremental=True)
    assert [r["event_slug"] for r in combined] == ["ksw-sherdog-999", "ksw-sherdog-777", "ksw-old", "ksw-women"]  # newest first, ESPN's rows last
    assert {"Eva Five", "Fay Six"} <= {p["name"] for p in people} and report["new_bouts"] == 1


def test_an_organization_built_from_sherdog_alone_refreshes_the_same_way(tmp_path, monkeypatch):
    from scripts.scrape_espn import save_csv

    monkeypatch.setattr(sd, "RAW_DATA_DIR", tmp_path)
    folder = tmp_path / "jungle-fight"
    folder.mkdir()
    old = sd.parse_event(page(row(1, ANA, BIA), day="2024-01-01"), "https://www.sherdog.com/events/Jungle-Fight-1-A-1", JUNGLE)
    fights = sd.fight_rows([old], JUNGLE)
    save_csv(folder / "fights.csv", FIGHT_FIELDS, fights)
    save_csv(folder / "fighters.csv", FIGHTER_FIELDS, sd.fighter_rows([old], fights, TODAY))
    before = (folder / "fights.csv").read_bytes()
    recent = sd.parse_event(page(row(1, CAL, DAN), day="2026-10-24"), "https://www.sherdog.com/events/Jungle-Fight-2-B-2", JUNGLE)
    assert sd.collect_supplement(JUNGLE, [recent], dry_run=True, incremental=True) == 0 and (folder / "fights.csv").read_bytes() == before
    assert sd.collect_supplement(JUNGLE, [recent], dry_run=False, incremental=True) == 0
    rows = read(folder / "fights.csv")
    assert [r["event_slug"] for r in rows] == ["jungle-fight-2", "jungle-fight-1"]  # the old card is still there, untouched
    once = (folder / "fights.csv").read_bytes()
    assert sd.collect_supplement(JUNGLE, [recent], dry_run=False, incremental=True) == 0 and (folder / "fights.csv").read_bytes() == once  # a second run changes nothing


def seed_jungle(tmp_path, monkeypatch, rows=1):
    from scripts.scrape_espn import save_csv

    monkeypatch.setattr(sd, "RAW_DATA_DIR", tmp_path)
    folder = tmp_path / "jungle-fight"
    folder.mkdir()
    old = sd.parse_event(page(*[row(n, ANA, BIA) for n in range(rows)], day="2024-01-01"), "https://www.sherdog.com/events/Jungle-Fight-1-A-1", JUNGLE)
    fights = sd.fight_rows([old], JUNGLE)
    save_csv(folder / "fights.csv", FIGHT_FIELDS, fights)
    save_csv(folder / "fighters.csv", FIGHTER_FIELDS, sd.fighter_rows([old], fights, TODAY))
    return folder


def test_a_refresh_with_nothing_new_is_not_an_error(tmp_path, monkeypatch, capsys):
    folder = seed_jungle(tmp_path, monkeypatch)
    before = (folder / "fights.csv").read_bytes()
    assert sd.collect_supplement(JUNGLE, [], dry_run=False, incremental=True) == 0 and "nothing new" in capsys.readouterr().out
    assert (folder / "fights.csv").read_bytes() == before
    # and when none of the pages the refresh asked for turns out to be an event of the organization
    assert sd.collect(JUNGLE, FakeFetcher({}), [sitemap("Jungle-Fight-1-A-1")], dry_run=False, recent_days=45) == 0
    assert (folder / "fights.csv").read_bytes() == before


def test_a_refresh_without_the_files_asks_for_a_full_run_first(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(sd, "RAW_DATA_DIR", tmp_path)
    assert sd.collect(JUNGLE, FakeFetcher({}), [sitemap("Jungle-Fight-1-A-1")], dry_run=False, recent_days=45) == 1
    assert "run it once in full first" in capsys.readouterr().out and not (tmp_path / "jungle-fight").exists()


def test_an_incremental_refresh_that_would_lose_rows_is_refused_and_leaves_the_files_alone(tmp_path, monkeypatch, capsys):
    folder = seed_jungle(tmp_path, monkeypatch, rows=60)  # one card of 60 bouts
    before = (folder / "fights.csv").read_bytes(), (folder / "fighters.csv").read_bytes()
    shrunk = sd.parse_event(page(row(1, CAL, DAN), day="2024-01-01"), "https://www.sherdog.com/events/Jungle-Fight-1-A-1", JUNGLE)  # the site now shows one bout of it
    assert sd.collect_supplement(JUNGLE, [shrunk], dry_run=False, incremental=True) == 1
    assert ((folder / "fights.csv").read_bytes(), (folder / "fighters.csv").read_bytes()) == before and "would drop rows" in capsys.readouterr().out


def test_two_fighters_with_one_name_stay_two_people_inside_sherdog_when_a_refresh_meets_them():
    first_dan = ("Dan Four", 4, "win")
    other_dan = ("Dan Four", 99, "loss")  # another person: another Sherdog profile, the same name
    fights, fighters = base()
    first = sd.supplement(KSW, [sd_event(row(1, first_dan, CAL), day="2025-03-08", ident="777")], fights, fighters, TODAY)
    event = sd_event(row(1, other_dan, EVA), day="2025-09-20", title="KSW 110", ident="888")
    combined, people, report = sd.supplement(KSW, [event], first[0], first[1], TODAY, incremental=True)
    urls = {r["fighter_1_url"] for r in combined if "sherdog" in r["event_slug"] and r["fighter_1"] == "Dan Four"}
    assert urls == {"https://www.sherdog.com/fighter/Dan-Four-4", "https://www.sherdog.com/fighter/Dan-Four-99"}  # not collapsed into one profile
    assert sorted(p["profile_url"] for p in people if p["name"] == "Dan Four") == sorted(urls)
    assert len({p["slug"] for p in people}) == len(people) and report["possible_same"] == []  # the slugs differ, and equal names are not "look-alikes"


def test_a_name_the_files_have_from_another_source_is_still_matched_by_name():
    fights, fighters = base()
    event = sd_event(row(1, CAL, DAN))
    fighters.append(espn_fighter("Cal Three"))  # ESPN's Cal Three
    combined, people, _ = sd.supplement(KSW, [event], fights, fighters, TODAY)
    [bout] = [r for r in combined if "sherdog" in r["event_slug"]]
    assert bout["fighter_1_url"] == "https://www.espn.com/mma/fighter/_/id/Cal"  # Sherdog's Cal Three is ESPN's
    assert [p["name"] for p in people].count("Cal Three") == 1  # one profile, not two


# --------------------------------------------------------------------------- completing the cards the other source has only in part

SHERDOG_PAGE = "https://www.sherdog.com/events/KSW-104-X-"
ALL = sd.SherdogOrg("ksw", ("KSW-",), "Konfrontacja Sztuk Walki", since=date(2004, 1, 1))  # KSW as registered: every date is considered


def test_a_card_the_files_have_in_part_gets_the_bouts_it_is_missing_under_the_same_event():
    fights, fighters = base()
    before = [dict(row) for row in fights]
    event = sd_event(row(3, CAL, DAN), row(2, ANA, BIA), row(1, EVA, FAY), day="2024-12-20", ident="500")  # Sherdog: three bouts, ESPN has Ana v Bia
    combined, people, report = sd.supplement(ALL, [event], fights, fighters, TODAY)
    card = sorted((r for r in combined if r["event_slug"] == "ksw-old"), key=lambda r: int(r["card_order"]))
    assert [r["fighter_1"] for r in card] == ["Cal Three", "Ana One", "Eva Five"]  # Sherdog's order: its main event first, ESPN's bout where Sherdog has it
    assert {(r["event_name"], r["event_date"], r["event_url"], r["location"]) for r in card} == {("KSW old", "2024-12-20", "https://www.espn.com/old", "Warsaw, Poland")}  # one card, the files' own
    assert [r["fight_url"] for r in card if r["fighter_1"] != "Ana One"] == [f"{SHERDOG_PAGE}500#fight-0", f"{SHERDOG_PAGE}500#fight-2"]
    espn = next(r for r in card if r["fighter_1"] == "Ana One")
    assert {k: v for k, v in espn.items() if k != "card_order"} == {k: v for k, v in before[0].items() if k != "card_order"}  # the bout ESPN had: only its place changed
    assert [r for r in combined if r["event_slug"] == "ksw-women"] == [before[1]]  # another card: untouched
    assert report["new_bouts"] == 2 and report["new_people"] == 4 and len(report["completed"]) == 1 and report["skipped_overlap"] == []


def test_a_card_a_day_apart_is_the_same_card_and_one_already_complete_is_left_exactly_as_it_is():
    fights, fighters = base()
    complete = sd_event(row(1, ANA, BIA), day="2024-12-21", ident="501")  # the day after, as the time zones give it; nothing to add
    combined, _, report = sd.supplement(ALL, [complete], fights, fighters, TODAY)
    assert combined == fights and report["new_bouts"] == 0 and len(report["skipped_overlap"]) == 1 and report["completed"] == []
    longer = sd_event(row(2, CAL, DAN), row(1, ANA, BIA), day="2024-12-21", ident="502")
    combined, _, _ = sd.supplement(ALL, [longer], fights, fighters, TODAY)
    assert {r["event_date"] for r in combined if r["event_slug"] == "ksw-old"} == {"2024-12-20"}  # under the files' day, not Sherdog's


def test_a_bout_only_the_other_source_has_is_kept_and_goes_after_sherdogs():
    fights, fighters = base()
    fights.append(espn_fight("old", "2024-12-20", "Gil Eight", "Hal Nine", winner="Gil Eight", order=1))  # ESPN has a bout Sherdog does not list
    event = sd_event(row(2, CAL, DAN), row(1, ANA, BIA), day="2024-12-20", ident="503")
    combined, _, _ = sd.supplement(ALL, [event], fights, fighters, TODAY)
    card = sorted((r for r in combined if r["event_slug"] == "ksw-old"), key=lambda r: int(r["card_order"]))
    assert [r["fighter_1"] for r in card] == ["Cal Three", "Ana One", "Gil Eight"]


def test_a_second_run_over_a_completed_card_gives_the_same_files_and_a_correction_replaces_the_bout_it_added():
    fights, fighters = base()
    event = sd_event(row(2, CAL, DAN), row(1, ANA, BIA), day="2024-12-20", ident="504")
    first = sd.supplement(ALL, [event], fights, fighters, TODAY)
    second = sd.supplement(ALL, [event], first[0], first[1], TODAY)
    assert second[0] == first[0] and second[1] == first[1]
    corrected = sd_event(row(2, CAL, DAN, method="KO (Punches)"), row(1, ANA, BIA), day="2024-12-20", ident="504")
    third, _, _ = sd.supplement(ALL, [corrected], first[0], first[1], TODAY, incremental=True)
    added = [r for r in third if r["fight_url"].startswith(SHERDOG_PAGE)]
    assert [(r["fighter_1"], r["method"]) for r in added] == [("Cal Three", "KO/TKO")]  # replaced, not kept beside the earlier one
    assert [r for r in third if not r["fight_url"].startswith(SHERDOG_PAGE)][0]["fighter_1"] == "Ana One"  # and ESPN's row is still there


def test_a_name_a_letter_apart_is_the_same_person_when_the_card_says_so_and_is_never_added_twice():
    fights, fighters = base()
    fights.append(espn_fight("k", "2025-01-10", "Kendrick Williams", "Bia Two", winner="Kendrick Williams"))
    fighters.append(espn_fighter("Kendrick Williams"))
    same_card = sd_event(row(1, ("Kendrik Williams", 20, "win"), BIA), day="2025-01-10", ident="600")  # same opponent, one letter fewer
    later = sd_event(row(1, ("Kendrik Williams", 20, "win"), CAL), day="2025-06-07", ident="601")  # Sherdog's spelling in a card ESPN does not have
    combined, people, report = sd.supplement(ALL, [same_card, later], fights, fighters, TODAY)
    assert [r["event_slug"] for r in combined].count("ksw-k") == 1  # the bout was not added again
    [added] = [r for r in combined if r["event_slug"] == "ksw-sherdog-601"]
    assert (added["fighter_1"], added["fighter_1_url"]) == ("Kendrick Williams", "https://www.espn.com/mma/fighter/_/id/Ken")  # one person, in the spelling the files have
    assert "Kendrik Williams" not in {p["name"] for p in people}
    assert report["respelled"] == ["2025-01-10 KSW 104: kendrik williams = kendrick williams"]


def test_two_doubtful_bouts_in_one_card_are_left_apart_rather_than_guessed():
    fights = [espn_fight("two", "2025-02-01", "Ana One", "Bia Two", winner="Ana One"), espn_fight("two", "2025-02-01", "Cal Three", "Dan Four", winner="Cal Three", order=1)]
    fighters = [espn_fighter(name) for name in ("Ana One", "Bia Two", "Cal Three", "Dan Four")]
    # Both Sherdog bouts have one fighter in common with both stored bouts' neighbours: nothing says which is which.
    event = sd_event(row(2, ANA, ("Cal Threee", 33, "loss")), row(1, CAL, ("Bia Twoo", 22, "loss")), day="2025-02-01", ident="610")
    combined, _, report = sd.supplement(ALL, [event], fights, fighters, TODAY)
    assert report["respelled"] == [] and report["new_bouts"] == 2


def test_the_order_of_the_two_fighters_does_not_matter_when_the_bouts_are_matched():
    stored = [{"fighter_1": "Ana One", "fighter_2": "Bia Two"}, {"fighter_1": "Cal Three", "fighter_2": "Dan Four"}]
    event = sd_event(row(2, DAN, CAL), row(1, ANA, BIA), day="2025-02-01", ident="611")
    matched, spellings = sd.match_bouts(event["bouts"], stored)
    assert matched == {0: 1, 1: 0} and spellings == {}  # the order of the two fighters does not matter


def test_a_bout_with_both_names_spelled_differently_is_not_added_again_once_other_cards_have_taught_each_spelling():
    fights, fighters = base()
    fights += [
        espn_fight("a", "2025-01-10", "Matt Adams", "Ben Wunder", winner="Matt Adams"),
        espn_fight("b", "2025-02-10", "Matt Adams", "Cal Three", winner="Matt Adams"),
        espn_fight("c", "2025-03-10", "Ben Wunder", "Dan Four", winner="Ben Wunder"),
    ]
    fighters += [espn_fighter("Matt Adams"), espn_fighter("Ben Wunder")]
    both_differ = sd_event(row(1, ("Matthew Adams", 40, "win"), ("Benjamin Wunder", 41, "loss")), day="2025-01-10", ident="620")  # neither name is ESPN's
    teaches_matthew = sd_event(row(1, ("Matthew Adams", 40, "win"), CAL), day="2025-02-10", ident="621")  # same opponent, so Matthew is Matt
    teaches_benjamin = sd_event(row(1, ("Benjamin Wunder", 41, "win"), DAN), day="2025-03-10", ident="622")
    combined, people, report = sd.supplement(ALL, [both_differ, teaches_matthew, teaches_benjamin], fights, fighters, TODAY)
    assert [r["event_slug"] for r in combined].count("ksw-a") == 1 and report["new_bouts"] == 0  # the card was complete all along
    assert {p["name"] for p in people} >= {"Matt Adams", "Ben Wunder"} and not {"Matthew Adams", "Benjamin Wunder"} & {p["name"] for p in people}


def test_a_bout_between_two_people_with_one_name_is_left_out_and_listed():
    fights, fighters = base()
    twins = sd_event(row(2, ("Lucas Silva", 50, "win"), ("Lucas Silva", 51, "loss")), row(1, CAL, DAN), day="2025-03-08", ident="630")  # two Lucas Silva, two profiles
    combined, people, report = sd.supplement(ALL, [twins], fights, fighters, TODAY)
    new = [r for r in combined if r["fight_url"].startswith("https://www.sherdog.com")]
    assert [(r["fighter_1"], r["fighter_2"]) for r in new] == [("Cal Three", "Dan Four")]  # a fighter booked against themself breaks every record in the files
    assert report["same_name"] == ["2025-03-08 KSW 104: Lucas Silva"] and "Lucas Silva" not in {p["name"] for p in people}


def test_a_name_the_files_already_have_as_a_fighter_is_never_renamed_but_the_bout_is_still_recognised():
    fights, fighters = base()
    fights.append(espn_fight("d", "2025-01-10", "David Olivia", "Bia Two", winner="David Olivia"))
    fighters += [espn_fighter("David Oliva"), espn_fighter("David Olivia")]  # ESPN lists one man under two spellings, as two profiles
    event = sd_event(row(1, ("David Oliva", 60, "win"), BIA), day="2025-01-10", ident="640")
    combined, people, report = sd.supplement(ALL, [event], fights, fighters, TODAY)
    assert [r["event_slug"] for r in combined].count("ksw-d") == 1 and report["new_bouts"] == 0  # the same bout: not added again
    assert report["respelled"] == []  # and no spelling is written down, which could swap the two ESPN profiles
    assert {"David Oliva", "David Olivia"} <= {p["name"] for p in people}


def test_an_apostrophe_does_not_make_two_spellings_two_people():
    fights, fighters = base()
    fights.append(espn_fight("t", "2025-01-10", "Jay Fuller", "Tre'ston Vines", winner="Jay Fuller"))
    fighters.append(espn_fighter("Tre'ston Vines"))
    event = sd_event(row(1, ("Jay Fuller", 70, "win"), ("Treston Vines", 71, "loss")), day="2025-01-10", ident="650")  # name_key reads Tre'ston as two words
    combined, _, report = sd.supplement(ALL, [event], fights, fighters, TODAY)
    assert [r["event_slug"] for r in combined].count("ksw-t") == 1 and report["new_bouts"] == 0
