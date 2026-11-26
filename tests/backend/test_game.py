import pytest

from backend.app.services.game_service import PLAYER_NAME, player_stats

FIGHTER = {"striking": 55, "takedowns": 45, "reach": 50, "age": 26, "wins": 6, "losses": 0, "draws": 0, "stance": "Orthodox"}


def ask(client, **extra):
    return client.post("/game/matchmaking", json={"fighter": FIGHTER, "division": "Lightweight", "seed": 7, **extra})


def test_three_fights_are_offered_from_safest_to_riskiest(client):
    response = ask(client)
    assert response.status_code == 200
    body = response.json()

    assert [offer["label"] for offer in body["opponents"]] == ["safe", "even", "risk"]
    chances = [offer["win_probability"] for offer in body["opponents"]]
    assert chances == sorted(chances, reverse=True)
    assert len({offer["name"] for offer in body["opponents"]}) == 3
    assert all(0.03 <= chance <= 0.97 for chance in chances)
    assert all(offer["name"] != PLAYER_NAME and not offer["champion"] for offer in body["opponents"])
    assert body["player"]["reach_cm"] > 0 and 0 < body["player"]["sig_str_acc"] < 1


def test_the_same_seed_offers_the_same_fights_and_another_seed_varies_them(client):
    first = [offer["name"] for offer in ask(client).json()["opponents"]]
    assert first == [offer["name"] for offer in ask(client).json()["opponents"]]
    others = {tuple(offer["name"] for offer in ask(client, seed=seed).json()["opponents"]) for seed in range(1, 8)}
    assert len(others | {tuple(first)}) > 1


def test_fighters_already_faced_are_left_out(client):
    first = [offer["name"] for offer in ask(client).json()["opponents"]]
    again = [offer["name"] for offer in ask(client, exclude=first).json()["opponents"]]
    assert not set(first) & set(again)


def test_a_title_shot_is_the_division_champion_alone(client):
    offers = ask(client, title=True).json()["opponents"]
    assert len(offers) == 1
    assert offers[0]["label"] == "champion" and offers[0]["champion"] is True


def test_named_opponents_are_scored_for_a_rematch(client):
    name = ask(client).json()["opponents"][0]["name"]
    offers = ask(client, names=[name]).json()["opponents"]
    assert [offer["name"] for offer in offers] == [name]
    assert offers[0]["label"] == "rematch"


def test_better_skills_raise_the_chance_against_the_same_opponent(client):
    weak = {**FIGHTER, "striking": 5, "takedowns": 5}
    strong = {**FIGHTER, "striking": 95, "takedowns": 95}
    name = ask(client).json()["opponents"][1]["name"]

    def chance(fighter):
        body = {"fighter": fighter, "division": "Lightweight", "names": [name]}
        return client.post("/game/matchmaking", json=body).json()["opponents"][0]["win_probability"]

    assert chance(strong) > chance(weak) + 0.1  # the model and the skill edge together


def test_skills_become_the_numbers_the_model_reads():
    low = player_stats(5, 5, 5, "Lightweight")
    high = player_stats(95, 95, 95, "Lightweight")
    assert low["sig_str_acc"] < high["sig_str_acc"]
    assert low["takedown_acc"] <= high["takedown_acc"]
    assert low["reach_cm"] < high["reach_cm"]
    # Reach is judged inside the division: the same percentile is longer in the heavyweights than in the flyweights.
    assert player_stats(50, 50, 50, "Heavyweight")["reach_cm"] > player_stats(50, 50, 50, "Flyweight")["reach_cm"]


@pytest.mark.parametrize(
    "change",
    [
        {"division": "Catch Weight"},
        {"fighter": {**FIGHTER, "striking": 120}},
        {"fighter": {**FIGHTER, "age": 10}},
        {"fighter": {**FIGHTER, "stance": "Sideways"}},
    ],
)
def test_nonsense_is_refused(client, change):
    body = {"fighter": FIGHTER, "division": "Lightweight", **change}
    assert client.post("/game/matchmaking", json=body).status_code == 422


def test_the_skill_edge_is_a_capped_share_of_the_average_gap():
    from backend.app.services.game_service import SKILL_EDGE_MAX, skill_edge

    even = {"striking": 50, "takedowns": 50, "reach": 50}
    assert skill_edge({**FIGHTER, **even}, even) == 0
    assert skill_edge({**FIGHTER, "striking": 80, "takedowns": 80, "reach": 80}, even) == pytest.approx(0.075)
    assert skill_edge({**FIGHTER, "striking": 100, "takedowns": 100, "reach": 100}, {"striking": 0, "takedowns": 0, "reach": 0}) == SKILL_EDGE_MAX
    assert skill_edge({**FIGHTER, "striking": 0, "takedowns": 0, "reach": 0}, {"striking": 100, "takedowns": 100, "reach": 100}) == -SKILL_EDGE_MAX


def test_an_opponent_is_placed_on_the_character_s_scale_and_unknown_numbers_sit_in_the_middle():
    from backend.app.services.game_service import opponent_skills

    best = opponent_skills({"sig_str_acc": 0.99, "takedown_acc": 0.99, "reach_cm": 230}, "Lightweight")
    worst = opponent_skills({"sig_str_acc": 0.01, "takedown_acc": 0.0, "reach_cm": 120}, "Lightweight")
    assert all(value > 95 for value in best.values()) and all(value < 15 for value in worst.values())
    assert opponent_skills({"sig_str_acc": None, "reach_cm": float("nan")}, "Lightweight") == {"striking": 50.0, "takedowns": 50.0, "reach": 50.0}


def test_ranked_opponents_carry_their_rank_from_the_official_rankings(client):
    from backend.app.services.rankings_service import get_rankings

    division = next(category for category in get_rankings() if category["category"] == "Lightweight")
    ranked = next(entry for entry in division["entries"] if entry["rank"] >= 1)
    offer = ask(client, names=[ranked["fighter"]]).json()["opponents"]
    assert offer and offer[0]["ranking"] == str(ranked["rank"])
