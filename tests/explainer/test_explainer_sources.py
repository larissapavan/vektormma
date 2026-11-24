"""How the project's data becomes the state (backend/explainer/fontes.py), with small dicts shaped like the services' answers."""

import math
from datetime import date

import pandas as pd
import pytest

from backend.explainer import fontes
from backend.explainer.estado import Luta
from backend.explainer.fontes import FontesDoProjeto, LutadorNaoEncontrado, chave, converter_confronto, converter_perfil, escolher_calibracao

ANA, BIA = "Ana Silva", "Bia Costa"
AVALIACAO = {
    "calibration": [
        {"label": "50%-55%", "fights": 451, "accuracy": 0.57},
        {"label": "55%-60%", "fights": 443, "accuracy": 0.564},
        {"label": "90%-100%", "fights": 40, "accuracy": 0.9},
        {"label": "sem faixa", "fights": 1, "accuracy": 1.0},
    ]
}


def perfil_ufc(**mudancas):
    return {
        "name": ANA, "wins": 15, "losses": 3, "draws": 0, "age": 29.7, "height_cm": 170.0, "reach_cm": 172.5, "stance": "Southpaw",
        "sig_str_acc": 0.52, "takedown_acc": 0.54, "sig_strikes_landed_per_min": 4.36, "sig_strikes_absorbed_per_min": 2.55,
        "takedown_avg_per_15min": 2.66, **mudancas,
    }


def luta_do_historico(**mudancas):
    return {"date": "2026-05-02", "opponent": "Cris Dias", "result": "win", "method": "SUB", **mudancas}


# --------------------------------------------------------------------------- profiles


def test_a_full_ufc_profile_has_nothing_missing():
    perfil = converter_perfil(perfil_ufc(), [luta_do_historico()])
    assert None not in perfil.model_dump().values()
    assert perfil.organizacao == "UFC"
    assert perfil.forma[0].data == date(2026, 5, 2)


def test_a_missing_measurement_stays_missing():
    perfil = converter_perfil(perfil_ufc(age=None, height_cm=math.nan, reach_cm=0.0, stance="Unknown"), [])
    assert (perfil.idade, perfil.altura_cm, perfil.envergadura_cm, perfil.base) == (None, None, None, None)


def test_the_stance_other_organizations_are_given_is_not_data():
    perfil = converter_perfil(perfil_ufc(data_origin="pfl", stance="Orthodox"), [])
    assert perfil.base is None
    assert perfil.organizacao == "PFL"


def test_a_record_of_zero_is_not_a_record():
    perfil = converter_perfil(perfil_ufc(wins=0, losses=0, draws=0), [])
    assert (perfil.vitorias, perfil.derrotas, perfil.empates) == (None, None, None)
    assert converter_perfil(perfil_ufc(wins=0, losses=2, draws=0), []).vitorias == 0


def test_the_zeros_of_a_fighter_without_striking_numbers_are_missing():
    zeros = dict.fromkeys(
        ("sig_str_acc", "takedown_acc", "sig_strikes_landed_per_min", "sig_strikes_absorbed_per_min", "takedown_avg_per_15min"), 0.0
    )
    perfil = converter_perfil(perfil_ufc(**zeros), [])
    assert perfil.golpes_por_minuto is None and perfil.precisao_golpes is None and perfil.golpes_recebidos_por_minuto is None
    assert perfil.quedas_por_15_min is None and perfil.precisao_quedas is None


def test_no_takedown_landed_is_data_but_its_accuracy_is_not():
    perfil = converter_perfil(perfil_ufc(takedown_avg_per_15min=0.0, takedown_acc=0.0), [])
    assert perfil.quedas_por_15_min == 0.0
    assert perfil.precisao_quedas is None


def test_recent_form_is_the_last_five_and_a_fight_nobody_won_says_so():
    lutas = [luta_do_historico(result=None, method="Overturned"), luta_do_historico(result="loss", date=None), *[luta_do_historico()] * 6]
    perfil = converter_perfil(perfil_ufc(), lutas)
    assert [luta.resultado for luta in perfil.forma] == ["sem_vencedor", "derrota", "vitoria", "vitoria", "vitoria"]
    assert perfil.forma[1].data is None
    assert perfil.lutas_ufc == 8


# --------------------------------------------------------------------------- head-to-head and calibration


def test_the_head_to_head_keeps_the_winner_of_each_meeting():
    confronto = converter_confronto(
        {
            "fighter_a_wins": 1, "fighter_b_wins": 1, "no_contests": 1,
            "meetings": [
                {"date": "2026-01-01", "result": None, "method": "Overturned"},
                {"date": "2025-01-01", "result": "loss", "method": "SUB"},
                {"date": "2024-01-01", "result": "win", "method": "KO/TKO"},
            ],
        },
        Luta(lutador_a=ANA, lutador_b=BIA),
    )
    assert [encontro.vencedor for encontro in confronto.encontros] == [None, BIA, ANA]
    assert (confronto.vitorias_a, confronto.vitorias_b, confronto.sem_vencedor) == (1, 1, 1)


@pytest.mark.parametrize("probabilidade, lutas", [(0.5, 451), (0.5499, 451), (0.55, 443), (1.0, 40)])
def test_the_calibration_row_is_the_one_the_probability_falls_in(probabilidade, lutas):
    assert escolher_calibracao(AVALIACAO, probabilidade).lutas == lutas


@pytest.mark.parametrize("avaliacao, probabilidade", [(None, 0.5), ({}, 0.5), ({"calibration": None}, 0.5), (AVALIACAO, 0.7)])
def test_there_is_no_calibration_where_none_was_measured(avaliacao, probabilidade):
    assert escolher_calibracao(avaliacao, probabilidade) is None


# --------------------------------------------------------------------------- names and prediction


class ServicoFalso:
    model_key = "prefight"
    feature_columns = ["elo_diff", "sig_acc_diff", "reach_diff"]
    recent_evaluation = AVALIACAO

    def __init__(self, **origens):
        self.origens = origens

    def predict_matchup(self, a, b):
        return {
            "predicted_winner": a, "probability": 0.57, "fighter_a_probability": 0.57, "fighter_b_probability": 0.43,
            "fighter_a_profile": {"name": a, "data_origin": self.origens.get("a")},
            "fighter_b_profile": {"name": b, "data_origin": self.origens.get("b"), "reach_cm": None},
            "main_factors": [
                {"feature": "Rating (Elo) difference", "impact": a, "explanation": "", "magnitude": 0.07},
                {"feature": "Striking accuracy gap", "impact": b, "explanation": "", "magnitude": 0.03},
            ],
        }

    def _both_orders(self, perfil_a, perfil_b):
        linha = pd.DataFrame([{"elo_diff": 10.0, "sig_acc_diff": math.nan, "reach_diff": 1.0}])
        return linha, -linha


@pytest.fixture
def projeto(monkeypatch):
    monkeypatch.setattr(fontes, "get_fighter_catalog", lambda: pd.DataFrame({"name": [ANA, BIA]}))
    monkeypatch.setattr(fontes, "canonical_name", lambda nome: {"Aninha": ANA}.get(nome, nome))

    def perfil(nome):
        if nome in ("Gil Nunes", "ana silva"):  # "ana silva" is someone else, in another organization's file
            return {"name": nome, "data_origin": "lfa"}
        raise KeyError(nome)

    monkeypatch.setattr(fontes, "get_fighter_profile", perfil)
    return lambda **origens: FontesDoProjeto(servico=ServicoFalso(**origens))


@pytest.mark.parametrize("digitado, oficial", [("ana silva", ANA), ("ANA  SÍLVA", ANA), ("Aninha", ANA), ("Gil Nunes", "Gil Nunes")])
def test_a_ufc_fighter_comes_before_a_namesake_elsewhere(projeto, digitado, oficial):
    assert projeto().resolver_nome(digitado) == oficial


def test_an_unknown_name_is_answered_with_the_closest_ones(projeto):
    with pytest.raises(LutadorNaoEncontrado, match="Ana Silva"):
        projeto().resolver_nome("Ana Silvva")


def test_the_prediction_keeps_the_service_numbers_and_marks_missing_data(projeto):
    predicao = projeto().prever(Luta(lutador_a=ANA, lutador_b=BIA))
    assert (predicao.prob_a, predicao.prob_b, predicao.favorito) == (0.57, 0.43, ANA)
    assert [(f.coluna, f.dado_ausente) for f in predicao.fatores] == [("elo_diff", False), ("sig_acc_diff", True)]
    assert predicao.calibracao.lutas == 443 and predicao.suavizada is False


@pytest.mark.parametrize("origem, suavizada", [("pfl", True), ("ksw", False)])
def test_a_fight_with_a_profile_from_outside_has_no_measured_accuracy(projeto, origem, suavizada):
    predicao = projeto(b=origem).prever(Luta(lutador_a=ANA, lutador_b=BIA))
    assert predicao.calibracao is None
    assert predicao.suavizada is suavizada


def test_the_earlier_model_fills_gaps_before_the_row_so_they_are_read_from_the_profile(projeto):
    do_projeto = projeto()
    do_projeto._servico.model_key = "current"
    cheio = dict.fromkeys(("age", "height_cm", "reach_cm", "sig_str_acc", "takedown_acc"), 1.0)
    ausentes = do_projeto._colunas_sem_dado(cheio, {**cheio, "reach_cm": None})
    assert {"reach_cm_diff", "reach_cm_sum", "blue_reach_cm"} <= ausentes
    assert "red_reach_cm" not in ausentes and "age_diff" not in ausentes


def test_a_name_key_ignores_accents_capitals_and_punctuation():
    assert chave("  José  O'Malley-Jr. ") == chave("jose o malley jr") == "jose o malley jr"
