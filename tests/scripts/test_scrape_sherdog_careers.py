import json

from scripts.scrape_sherdog_careers import (
    CareerLinker,
    career_entry,
    opponent_links,
    organization_of,
    parse_fighter_page,
    ranked_candidates,
    save,
    search_candidates,
    verify,
)


def bout(result, opponent, href, event, day, method="KO (Punches)", referee="Marc Goddard", rnd="2", time="4:58"):
    return f"""<tr><td><span class="final_result {result}">{result}</span></td>
    <td><a href="{href}">{opponent}</a></td>
    <td><a href="/events/x"><span itemprop="award">{event}</span></a><br/><span class="sub_line">{day}</span></td>
    <td class="winby"><b>{method}</b><br/><span class="sub_line"><a href="/referee/r">{referee}</a></span></td>
    <td>{rnd}</td><td>{time}</td></tr>"""


HEAD = '<tr class="table_head"><td>Result</td><td>Fighter</td><td>Event</td><td>Method</td><td>R</td><td>Time</td></tr>'
PAGE = f"""<html><head><meta property="og:url" content="//www.sherdog.com/fighter/Navajo-Stirling-413272" /></head><body>
<h1><span class="fn">Navajo Stirling</span></h1>
<div class="tiled_bg">FIGHT HISTORY - PRO</div>
<div class="module fight_history"><table>{HEAD}
{bout("win", "Jiri Prochazka", "/fighter/Jiri-Prochazka-97529", "UFC Fight Night 294 - Prochazka vs. Stirling", "Nov / 21 / 2026")}
{bout("win", "Phillip Latu", "/fighter/Phillip-Latu-1", "Dana White's Contender Series - Contender Series 2024: Week 5", "Sep / 10 / 2024")}
{bout("NC", "Some One", "/fighter/Some-One-2", "HFS - Hex Fight Series 30", "May / 04 / 2024", method="NC (Overturned)", referee="", rnd="1", time="1:00")}
{bout("loss", "Old Foe", "/fighter/Old-Foe-3", "ACB 70 - Sheffield", "Sep / 23 / 2022", method="Decision (Unanimous)", rnd="3", time="5:00")}
</table></div>
<div class="tiled_bg">FIGHT HISTORY - AMATEUR</div>
<div class="module fight_history"><table>{HEAD}
{bout("win", "Amateur Guy", "/fighter/Amateur-Guy-4", "Amateur Show 1", "Jan / 01 / 2020")}
</table></div></body></html>"""


def test_the_page_gives_the_professional_bouts_oldest_first_and_skips_amateur_ones():
    page = parse_fighter_page(PAGE)

    assert page["name"] == "Navajo Stirling"
    assert page["url"] == "https://www.sherdog.com/fighter/Navajo-Stirling-413272"
    assert [(f["date"], f["opponent"], f["result"]) for f in page["fights"]] == [
        ("2022-09-23", "Old Foe", "loss"),
        ("2024-05-04", "Some One", "nc"),
        ("2024-09-10", "Phillip Latu", "win"),
        ("2026-11-21", "Jiri Prochazka", "win"),
    ]
    last = page["fights"][-1]
    assert (last["method"], last["referee"], last["round"], last["time"], last["organization"], last["is_ufc"]) == (
        "KO (Punches)", "Marc Goddard", 2, "4:58", "UFC", True,
    )
    assert last["opponent_url"] == "https://www.sherdog.com/fighter/Jiri-Prochazka-97529"


def test_the_organization_comes_from_the_event_name():
    assert organization_of("UFC 315 - Muhammad vs. Della Maddalena") == ("UFC", True)
    assert organization_of("The Ultimate Fighter 28 Finale") == ("UFC", True)
    assert organization_of("UFC - The Ultimate Fighter 28 Finale") == ("UFC", True)
    assert organization_of("UFC - Road to UFC Season 3: Shanghai Quarterfinals 4") == ("Road to UFC", False)
    assert organization_of("UFC - Road to UFC Season 2: Las Vegas Finals") == ("UFC", True)
    assert organization_of("UFC Venezuela 4 - National MMA 2") == ("UFC Venezuela", False)
    assert organization_of("LFA 150 - Pereira vs. Silva") == ("LFA", False)
    assert organization_of("Jungle Fight 82") == ("Jungle Fight", False)
    assert organization_of("HFS - Hex Fight Series 31") == ("Hex Fight Series", False)
    assert organization_of("FSC 34 - FightStar Championship 34") == ("FightStar Championship", False)
    assert organization_of("UKFC - UK Fighting Championships 9") == ("UK Fighting Championships", False)
    assert organization_of("ACB 70 - Sheffield") == ("ACB", False)
    assert organization_of("Dana White's Contender Series - Contender Series 2024: Week 5") == ("Dana White's Contender Series", False)


def test_a_page_is_linked_only_when_it_holds_our_ufc_bouts():
    fights = parse_fighter_page(PAGE)["fights"]

    # The date can be a day off (local time against UTC) and the spelling can differ.
    assert verify([{"date": "2026-11-22", "opponent": "Jiří Procházka"}], fights) == (True, 1)
    assert verify([{"date": "2026-11-21", "opponent": "Someone Else Entirely"}], fights) == (False, 0)
    assert verify([], fights) == (False, 0)
    # Four of five bouts found is enough (a name Sherdog spells its own way); three of five is not.
    ours = [{"date": "2026-11-21", "opponent": "Jiri Prochazka"}] * 4 + [{"date": "2025-01-01", "opponent": "Missing"}]
    assert verify(ours, fights) == (True, 4)
    assert verify(ours[:3] + ours[4:] * 2, fights) == (False, 3)


def test_the_entry_counts_the_records_and_links_the_opponents():
    page = parse_fighter_page(PAGE)
    entry = career_entry("Navajo Stirling", page, "2026-11-21")

    assert entry["complete_record"] == {"total": 4, "wins": 2, "losses": 1, "draws": 0, "nc": 1, "win_rate": 50}
    assert entry["ufc_record"] == {"total": 1, "wins": 1, "losses": 0, "draws": 0, "nc": 0, "win_rate": 100}
    assert entry["organizations"] == ["ACB", "Dana White's Contender Series", "Hex Fight Series", "UFC"]
    assert entry["sherdog_url"].endswith("Navajo-Stirling-413272")
    assert opponent_links([{"date": "2026-11-21", "opponent": "Jiri Prochazka"}], page) == {
        "jiri prochazka": "https://www.sherdog.com/fighter/Jiri-Prochazka-97529",
    }


def test_the_fight_finder_tries_the_exact_name_first():
    html = """<table class="new_table fightfinder_result">
    <tr><td>Fighter</td><td>Nickname</td></tr>
    <tr><td></td><td><a href="/fighter/Alex-Pereira-442032">Alex  Pereira</a></td><td>"Gigante"</td></tr>
    <tr><td></td><td><a href="/fighter/Alexander-Pereira-384315">Alexander Pereira</a></td><td></td></tr>
    <tr><td></td><td><a href="/fighter/Alex-Pereira-224511">Alex Pereira</a></td><td>"Poatan"</td></tr>
    <tr><td></td><td><a href="/fighter/Bob-Smith-1">Bob Smith</a></td><td></td></tr>
    </table>"""
    found = search_candidates(html)
    assert len(found) == 4
    assert ranked_candidates("Alex Pereira", found) == [
        "https://www.sherdog.com/fighter/Alex-Pereira-442032",
        "https://www.sherdog.com/fighter/Alex-Pereira-224511",
    ]  # "Alexander Pereira" is too far from "Alex Pereira" to be worth a request


def test_the_file_has_one_fighter_per_line_and_reads_back(tmp_path):
    entry = career_entry("Navajo Stirling", parse_fighter_page(PAGE), "2026-11-21")
    output, unmatched = tmp_path / "careers.json", tmp_path / "unmatched.csv"
    save({"Navajo Stirling": entry, "Jiří Test": entry}, {"Nobody": {"name": "Nobody", "reason": "r", "candidates": "", "checked": "2026-11-21"}}, output, unmatched)

    assert json.loads(output.read_text(encoding="utf-8"))["Navajo Stirling"] == entry
    assert len(output.read_text(encoding="utf-8").splitlines()) == 4
    assert unmatched.read_text(encoding="utf-8").splitlines() == ["name,reason,candidates,checked", "Nobody,r,,2026-11-21"]


def test_the_hand_kept_file_wins_over_sherdog(tmp_path, monkeypatch):
    from backend.app.services import career_fights_service as service

    hand, sherdog = tmp_path / "hand.json", tmp_path / "sherdog.json"
    hand.write_text(json.dumps({"Alex Pereira": {"source": "hand"}}), encoding="utf-8")
    sherdog.write_text(json.dumps({"Alex Pereira": {"source": "sherdog"}, "Navajo Stirling": {"source": "sherdog"}}), encoding="utf-8")
    monkeypatch.setattr(service, "CACHE_FILE", hand)
    monkeypatch.setattr(service, "SHERDOG_FILE", sherdog)

    assert service.get_career_history("Alex Pereira") == {"source": "hand"}
    assert service.get_career_history("navajo stirling") == {"source": "sherdog"}
    assert service.get_career_history("Nobody") is None


def test_a_ufc_bout_against_a_nickname_still_counts():
    sherdog = [{"date": "2026-04-11", "opponent": "Patricio Freire", "is_ufc": True}, {"date": "2019-01-01", "opponent": "Patricio Freire", "is_ufc": False}]
    assert verify([{"date": "2026-04-11", "opponent": "Patricio Pitbull"}], sherdog) == (True, 1)
    # Outside the UFC, or on another day, a shared first name is not enough.
    assert verify([{"date": "2019-01-01", "opponent": "Patricio Pitbull"}], sherdog) == (False, 0)
    assert verify([{"date": "2026-05-11", "opponent": "Patricio Pitbull"}], sherdog) == (False, 0)


class FakeFetcher:
    def __init__(self, pages):
        self.pages = pages
        self.asked = []

    def get(self, url):
        self.asked.append(url)
        return self.pages.get(url)


def test_a_fighter_the_finder_does_not_know_is_found_through_a_linked_opponent():
    opponent_page = PAGE  # Navajo Stirling's page links Jiri Prochazka next to their bout
    prochazka = f"""<html><head><meta property="og:url" content="//www.sherdog.com/fighter/Jiri-Prochazka-97529" /></head><body>
    <span class="fn">Jiri Prochazka</span><div class="tiled_bg">FIGHT HISTORY - PRO</div><div class="module fight_history"><table>{HEAD}
    {bout("loss", "Navajo Stirling", "/fighter/Navajo-Stirling-413272", "UFC Fight Night 294 - Prochazka vs. Stirling", "Nov / 21 / 2026")}
    </table></div></body></html>"""
    fetcher = FakeFetcher({
        "https://www.sherdog.com/stats/fightfinder?SearchTxt=jiri+denisa": "<table class='fightfinder_result'></table>",
        "https://www.sherdog.com/fighter/Navajo-Stirling-413272": opponent_page,
        "https://www.sherdog.com/fighter/Jiri-Prochazka-97529": prochazka,
    })
    careers = {"Navajo Stirling": career_entry("Navajo Stirling", parse_fighter_page(PAGE), "2026-11-21")}
    # The UFC bills him by a name the finder does not know; his opponent's page leads to him.
    ours = {"Jiri Denisa": [{"date": "2026-11-21", "opponent": "Navajo Stirling"}]}
    linker = CareerLinker(fetcher, careers, lambda name: ours[name], "2026-11-21")

    entry, reason, tried = linker.link("Jiri Denisa")

    assert reason == "" and entry["sherdog_url"].endswith("Jiri-Prochazka-97529")
    assert tried == ["https://www.sherdog.com/fighter/Jiri-Prochazka-97529"]
