"""How a typed name finds its profile: the UFC catalog first (exact, then loose spelling), then the other organizations."""

from __future__ import annotations

import pandas as pd
import pytest

from backend.app.services import catalog_service, org_service
from backend.app.services.catalog_service import get_fighter_catalog, get_fighter_profile, load_name_aliases
from backend.app.services.data_confidence import assess
from backend.app.services.prediction_service import _eased
from backend.app.services.prefight_service import PrefightPredictionService


def _org_file(monkeypatch, *names):
    """One organization whose file holds these fighters (99 wins each), and nothing else outside the UFC catalog."""
    fighters = [{"name": name, "wins": 99, "losses": 0, "draws": 0} for name in names]
    monkeypatch.setattr(org_service, "get_org_fighters", lambda org_id: fighters if org_id == "lfa" else [])


@pytest.mark.parametrize(
    ("typed", "expected"),
    [
        ("Alex Pereira", "Alex Pereira"),
        ("alex pereira", "Alex Pereira"),
        ("ALEX PEREIRA", "Alex Pereira"),
        ("  Alex   Pereira ", "Alex Pereira"),
        ("Aléx Pereira", "Alex Pereira"),
        ("Jiří Procházka", "Jiri Prochazka"),
        ("Jan Błachowicz", "Jan Blachowicz"),  # ł does not decompose into l + accent
        ("sean omalley", "Sean O'Malley"),
        ("Sean O’Malley", "Sean O'Malley"),
        ("sean o malley", "Sean O'Malley"),
        ("J.J. Aldrich", "JJ Aldrich"),
        ("Benoit Saint-Denis", "Benoit Saint Denis"),
        ("José Mauro Delano", "Jose Delano"),  # an alias (name_aliases.csv), written with an accent
    ],
)
def test_a_ufc_name_in_any_spelling_gets_the_ufc_profile(monkeypatch, typed, expected):
    # The same name exists in another organization's file: the UFC one must still win.
    _org_file(monkeypatch, typed, expected)
    profile = get_fighter_profile(typed)
    assert profile["name"] == expected
    assert profile.get("data_origin") is None
    assert profile["wins"] != 99


def test_a_lowercase_ufc_name_skips_the_homonym_in_the_real_files():
    # The case that was wrong: the LFA file has an Alex Pereira too.
    assert any(fighter["name"] == "Alex Pereira" for fighter in org_service.get_org_fighters("lfa"))
    assert get_fighter_profile("alex pereira") == get_fighter_profile("Alex Pereira")


@pytest.mark.parametrize("typed", ["Zeferino Qwerty", "zeferino qwerty", "Zeferíno Qwerty"])
def test_a_fighter_only_in_another_organization_still_resolves(monkeypatch, typed):
    _org_file(monkeypatch, "Zeferino Qwerty")
    profile = get_fighter_profile(typed)
    assert profile["name"] == "Zeferino Qwerty"
    assert profile["data_origin"] == "lfa"
    assert profile["wins"] == 99


def test_a_profile_without_a_career_record_has_no_win_rate(monkeypatch):
    """ONE's files have no career record for most fighters: that is not half wins and half losses."""
    monkeypatch.setattr(org_service, "get_org_fighters", lambda org: [{"name": "Zeferino Qwerty", "wins": None, "losses": None, "draws": None, "win_rate": None}] if org == "one" else [])
    profile = get_fighter_profile("Zeferino Qwerty")
    assert profile["data_origin"] == "one"
    assert profile["win_rate"] is None


def test_spaces_still_tell_two_people_apart():
    # ONE's flyweight Dawoon Jung is not the UFC light heavyweight Da Woon Jung.
    assert get_fighter_profile("Dawoon Jung")["data_origin"] == "one"
    assert get_fighter_profile("da woon jung")["name"] == "Da Woon Jung"


@pytest.fixture(scope="module")
def prefight():
    return PrefightPredictionService()


def _ufc_fights(prefight, name: str) -> int:
    """UFC fights the pre-fight model replays for a name."""
    state = prefight._tracker.states.get(prefight._key(name))
    return state.fights if state else 0


@pytest.mark.parametrize("org_id", list(org_service.ORGS))
def test_a_fighter_whose_ufc_history_the_model_replays_gets_the_ufc_profile(prefight, org_id):
    wrong = [
        fighter["name"]
        for fighter in org_service.get_org_fighters(org_id)
        if _ufc_fights(prefight, fighter["name"]) and get_fighter_profile(fighter["name"]).get("data_origin")
    ]
    assert not wrong, f"{org_id}: a UFC history in the model, but the profile of another organization: {wrong}"


@pytest.mark.parametrize(
    ("org_id", "listed", "ufc_name"),
    [
        # Accents and hyphens: the loose lookup.
        ("bellator", "Adrian Yañez", "Adrian Yanez"),
        ("bellator", "Gaston Bolaños", "Gaston Bolanos"),
        ("bellator", "Landon Quiñones", "Landon Quinones"),
        ("one", "Waldo Cortes-Acosta", "Waldo Cortes Acosta"),
        ("rizin", "Jiří Procházka", "Jiri Prochazka"),
        # Another spelling of the same person: name_aliases.csv.
        ("pfl", "Cris Cyborg", "Cristiane Justino"),
        ("pfl", "Antonio Carlos Jr.", "Antonio Carlos Junior"),
        ("bellator", "Jose Maria Tomé", "Jose Maria"),
        ("one", "Xiong Jing Nan", "Xiong Jingnan"),
        ("one", "Ham Seo-hee", "Seo Hee Ham"),
        ("ksw", "Phil de Fries", "Philip De Fries"),
        ("rizin", "Ulka Sasaki", "Yuta Sasaki"),
        ("lfa", "Jose Mariscal", "Chepe Mariscal"),
        ("lfa", "Jose Henrique", "Jose Souza"),
        ("cage-warriors", "Mark O. Madsen", "Mark Madsen"),
        ("oktagon", "Isabella de Padua", "Isabela de Padua"),
        ("jungle-fight", "Ronaldo Souza", "Jacare Souza"),
        ("invicta", "Konklak Suphisara", "Loma Lookboonmee"),
    ],
)
def test_a_ufc_fighter_listed_under_another_spelling_gets_the_ufc_profile(prefight, org_id, listed, ufc_name):
    assert listed in {fighter["name"] for fighter in org_service.get_org_fighters(org_id)}
    profile = get_fighter_profile(listed)
    assert profile["name"] == ufc_name
    assert profile.get("data_origin") is None
    assert _ufc_fights(prefight, profile["name"]) > 0
    # What data_origin would do: pull the probability to 50% and say that the UFC numbers are missing.
    assert _eased(0.8, profile) == 0.8
    assert not any("outside the UFC" in reason for reason in assess(profile, profile)["reasons"])


@pytest.mark.parametrize("name", ["Dawoon Jung", "Patricky Pitbull", "Usman Nurmagomedov", "Tyree Fortune", "Kevin Ferguson Jr.", "Lucas Almeida Barreto"])
def test_a_brother_or_a_near_namesake_of_a_ufc_fighter_keeps_the_own_profile(prefight, name):
    profile = get_fighter_profile(name)
    assert profile["name"] == name
    assert profile["data_origin"]
    assert _ufc_fights(prefight, name) == 0


def test_the_lfa_flyweight_bruno_silva_is_not_the_ufc_middleweight():
    # ESPN calls both men Bruno Silva (data/raw/espn_athletes.csv): the LFA file has the flyweight, under his catalog name.
    [bulldog] = [fighter for fighter in org_service.get_org_fighters("lfa") if (fighter["profile_url"] or "").endswith("/id/3895544")]
    profile = get_fighter_profile(bulldog["name"])
    assert (profile["nickname"], profile["division"]) == ("Bulldog", "Flyweight")
    assert get_fighter_profile("Bruno Silva")["nickname"] == "Blindado"


def test_the_duplicate_row_of_jose_souza_is_folded_into_him():
    assert "Jose Henrique" not in set(get_fighter_catalog()["name"])


def test_every_alias_leads_to_a_catalog_fighter():
    names = set(get_fighter_catalog()["name"])
    assert {alias: name for alias, name in load_name_aliases().items() if name not in names} == {}


@pytest.mark.parametrize("typed", ["Definitely Not A Real Fighter Name", "definitely not a real fighter name", "!!!", ""])
def test_an_unknown_name_still_raises_key_error(typed):
    with pytest.raises(KeyError):
        get_fighter_profile(typed)


def test_every_catalog_name_finds_its_own_row():
    catalog = get_fighter_catalog()
    for position, name in enumerate(catalog["name"]):
        assert catalog_service._catalog_position(catalog, name) == position or catalog_service.canonical_name(name) != name


def test_two_fighters_one_loose_key_the_active_one_gets_it_and_the_exact_spelling_finds_the_other():
    catalog = pd.DataFrame(
        {
            "name": ["Zé Qwerty", "Ze Qwerty", "Zè Qwerty"],
            "is_active": [False, False, True],
            "ufc_status": ["never", "former", "active"],
        }
    )
    assert catalog_service._catalog_position(catalog, "ze qwerty") == 2
    assert catalog_service._catalog_position(catalog, "Ze Qwerty") == 1
    assert catalog_service._catalog_position(catalog.iloc[:2].copy(), "ze qwerty") == 1
    assert catalog_service._catalog_position(catalog, "Someone Else") is None


def test_the_name_index_is_built_once_per_catalog():
    catalog = get_fighter_catalog()
    exact, loose = catalog_service._name_index(catalog)
    for name in ("Alex Pereira", "alex pereira", "nobody at all"):
        catalog_service._catalog_position(catalog, name)
    again = catalog_service._name_index(catalog)
    assert again[0] is exact and again[1] is loose

    # A rebuilt catalog (a data file changed) is a new object: it gets an index of its own.
    rebuilt = catalog.iloc[::-1].reset_index(drop=True)
    assert catalog_service._catalog_position(rebuilt, "alex pereira") == len(catalog) - 1 - catalog_service._catalog_position(catalog, "alex pereira")


def test_predicting_with_a_lowercase_name_gives_the_same_answer(client):
    typed = client.post("/predict", json={"fighter_a": "alex pereira", "fighter_b": "magomed ankalaev"}).json()
    exact = client.post("/predict", json={"fighter_a": "Alex Pereira", "fighter_b": "Magomed Ankalaev"}).json()
    assert typed["fighter_a_probability"] == exact["fighter_a_probability"]
    assert typed["fighter_a_profile"] == exact["fighter_a_profile"]


@pytest.mark.parametrize("path", ["performance", "opponents", "similar", "elo", "other-organizations"])
def test_the_fighter_endpoints_read_the_same_fighter_in_any_spelling(client, path):
    exact = client.get(f"/fighters/Jiri Prochazka/{path}")
    assert exact.status_code == 200
    for typed in ("jiri prochazka", "Jiří Procházka"):
        response = client.get(f"/fighters/{typed}/{path}")
        assert response.status_code == 200
        assert response.json() == exact.json()


def test_head_to_head_reads_the_same_fights_in_any_spelling(client):
    exact = client.get("/head-to-head", params={"fighter_a": "Alex Pereira", "fighter_b": "Jiri Prochazka"}).json()
    assert len(exact["meetings"]) >= 2
    assert client.get("/head-to-head", params={"fighter_a": "alex pereira", "fighter_b": "Jiří Procházka"}).json() == exact
