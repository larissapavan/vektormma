from scripts.scrape_rankings import GROUPS_EXPECTED, classify_header, clean_athlete_url, parse_rank_change, parse_rankings, rankings_problem


def test_rankings_problem_rejects_a_partial_page():
    assert "zero" in rankings_problem([])
    assert "categories" in rankings_problem([{"category": "Flyweight", "fighter": "A"}])

    full = [{"category": f"Division {index}", "fighter": "A"} for index in range(GROUPS_EXPECTED)]
    assert rankings_problem(full) is None
    assert "dropped" in rankings_problem(full, previous_rows=len(full) * 2)
    full[0] = {**full[0], "fighter": "  "}
    assert "fighter" in rankings_problem(full)


def test_ranking_changes_report_moves_entries_exits_and_a_new_champion():
    from scripts.scrape_rankings import ranking_changes

    def row(category, rank, fighter):
        return {"category": category, "rank": rank, "fighter": fighter}

    old = [row("Flyweight", 0, "Champ"), row("Flyweight", 1, "Second"), row("Flyweight", 2, "Third"), row("Flyweight", 3, "Gone")]
    new = [row("Flyweight", 0, "Second"), row("Flyweight", 1, "Champ"), row("Flyweight", 2, "Third"), row("Flyweight", 3, "Fresh")]
    assert ranking_changes(old, new) == [
        "Flyweight: Second is now champion",
        "Flyweight: Champ #C -> #1",
        "Flyweight: Fresh enters at #3",
        "Flyweight: Gone left the rankings",
    ]
    assert ranking_changes(old, old) == []


def test_clean_athlete_url_drops_the_escaped_index_php_prefix():
    assert clean_athlete_url("/index%2ephp/athlete/petr-yan") == "/athlete/petr-yan"
    assert clean_athlete_url("/athlete/petr-yan") == "/athlete/petr-yan"
    assert clean_athlete_url(None) is None


def test_the_english_page_is_read_like_the_portuguese_one():
    assert classify_header("Flyweight") == ("Flyweight", False)
    assert classify_header("Women's Bantamweight") == ("Women's Bantamweight", False)
    assert classify_header("Peso-mosca") == ("Flyweight", False)
    assert classify_header("Men's Pound-for-PoundTop Rank") == ("Pound-for-Pound (Men's)", True)
    assert parse_rank_change("Rank increased by 4") == "up"
    assert parse_rank_change("Rank decreased by 1") == "down"
    assert parse_rank_change("NR") == "new"
    assert parse_rank_change("Subiu 2") == "up"
    assert parse_rank_change("") is None


def test_letters_without_a_plain_form_are_spelled_in_ascii():

    html = """<div class="view-grouping"><div class="view-grouping-header">Light Heavyweight</div>
    <table><tbody><tr><td>11</td><td><a href="/athlete/jan-blachowicz">Jan Błachowicz</a></td><td></td></tr></tbody></table></div>"""
    assert [row["fighter"] for row in parse_rankings(html)] == ["Jan Blachowicz"]
