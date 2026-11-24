"""Each node of backend/explainer on its own, with made-up data."""

import math

import pytest
from pydantic import ValidationError

from backend.explainer import nos, textos, validacao
from backend.explainer.estado import Calibracao, ConfrontoDireto, Luta, Predicao, Validacao
from backend.explainer.fontes import LutadorNaoEncontrado, LutaInvalida

ANA, BIA = "Ana Silva", "Bia Costa"


def erros_de(estado):
    return nos.validar_saida(estado)["validacao"].erros


# --------------------------------------------------------------------------- buscar_predicao


def test_buscar_predicao_uses_the_official_names_and_the_service(runtime, fontes):
    saida = nos.buscar_predicao({"luta": Luta(lutador_a="ana silva", lutador_b="BIA COSTA")}, runtime)
    assert saida["luta"] == Luta(lutador_a=ANA, lutador_b=BIA)
    assert saida["predicao"] is fontes.predicao
    assert saida["usou_fallback"] is False


def test_buscar_predicao_refuses_an_unknown_fighter(runtime):
    with pytest.raises(LutadorNaoEncontrado, match="Zé"):
        nos.buscar_predicao({"luta": Luta(lutador_a=ANA, lutador_b="Zé")}, runtime)


def test_buscar_predicao_refuses_a_fighter_against_themselves(runtime):
    with pytest.raises(LutaInvalida):
        nos.buscar_predicao({"luta": Luta(lutador_a=ANA, lutador_b=ANA.upper())}, runtime)


def test_a_fight_needs_two_names():
    with pytest.raises(ValidationError):
        Luta(lutador_a=ANA, lutador_b="")


# --------------------------------------------------------------------------- calcular_fatores


def test_calcular_fatores_sorts_labels_and_drops_what_did_not_weigh(luta, fontes):
    fatores = nos.calcular_fatores({"luta": luta, "predicao": fontes.predicao})["fatores"]
    assert [f.coluna for f in fatores] == ["elo_diff", "reach_diff", "td_acc_diff"]  # womens weighed 0
    assert fatores[0].rotulo == "diferença de pontuação (Elo)"
    assert fatores[0].favorece == ANA
    assert [f.dado_ausente for f in fatores] == [False, False, True]


def test_a_column_of_one_fighter_is_labelled_with_the_name(luta):
    assert textos.rotulo_do_fator("red_reach_cm", luta) == f"envergadura de {ANA}"
    assert textos.rotulo_do_fator("blue_stance_Southpaw", luta) == f"base de {BIA}"
    assert textos.rotulo_do_fator("coluna_nova", luta) == ""


# --------------------------------------------------------------------------- buscar_contexto


def test_buscar_contexto_brings_both_profiles_and_the_head_to_head(luta, runtime, fontes):
    contexto = nos.buscar_contexto({"luta": luta}, runtime)["contexto"]
    assert (contexto.perfil_a.nome, contexto.perfil_b.nome) == (ANA, BIA)
    assert contexto.confronto == fontes.confronto_direto


# --------------------------------------------------------------------------- montar_texto


def test_montar_texto_shows_the_chances_and_the_measured_uncertainty(estado):
    texto = estado["texto"]
    assert f"cerca de 62% de chance para {ANA} e 38% para {BIA}" in texto
    assert "nas 336 lutas de teste em que o modelo deu de 60% a 65%" in texto
    assert "acertou 63,7% e errou 36,3%" in texto
    assert "o resultado oposto continua possível" in texto


def test_montar_texto_describes_factors_by_order_and_direction_only(estado):
    linhas = estado["texto"].splitlines()
    inicio = linhas.index("Fatores que mais pesaram na predição do modelo, do maior para o menor:")
    assert linhas[inicio + 1] == f"- diferença de pontuação (Elo): pesou a favor de {ANA}"
    assert linhas[inicio + 2] == f"- diferença de envergadura: pesou a favor de {BIA}"
    assert "o modelo leu um valor típico" in linhas[inicio + 3]


def test_montar_texto_brings_stats_form_and_head_to_head(estado):
    texto = estado["texto"]
    assert "cartel 15-3-0" in texto and "29 anos" in texto and "172,5 cm de envergadura" in texto
    assert "nas últimas 2 lutas no UFC: 1 vitória e 1 derrota; a mais recente foi vitória sobre Cris 100 Dias (finalização), em 02/05/2026" in texto
    assert f"1 encontro no UFC: {ANA} 0, {BIA} 1." in texto
    assert f"- 08/11/2025: vitória de {BIA} (decisão unânime)" in texto


def test_montar_texto_says_what_is_missing_instead_of_filling_it(estado):
    assert f"{BIA}: sem dado de envergadura e base." in estado["texto"]
    assert f"{ANA}: sem dado" not in estado["texto"]


def test_montar_texto_says_when_a_fighter_has_no_ufc_history(estado):
    contexto = estado["contexto"]
    sem_historico = contexto.perfil_b.model_copy(update={"lutas_ufc": 0, "forma": ()})
    estado["contexto"] = contexto.model_copy(update={"perfil_b": sem_historico, "confronto": ConfrontoDireto()})
    estado.update(nos.montar_texto(estado))
    assert f"{BIA}: sem lutas no histórico do UFC" in estado["texto"]
    assert "Nenhum encontro entre os dois nomes" in estado["texto"]
    assert not erros_de(estado)


def test_montar_texto_writes_nothing_for_an_invalid_prediction(estado):
    estado["predicao"] = estado["predicao"].model_copy(update={"prob_b": 0.9})
    assert nos.montar_texto(estado) == {"texto": ""}


def test_a_close_fight_is_called_balanced(estado):
    estado["predicao"] = estado["predicao"].model_copy(update={"prob_a": 0.51, "prob_b": 0.49})
    assert "luta equilibrada" in nos.montar_texto(estado)["texto"]


@pytest.mark.parametrize(
    "mudanca, trecho",
    [
        ({"calibracao": None}, "não há medida de acerto do modelo"),
        ({"suavizada": True}, "puxada em direção a 50%"),
        ({"calibracao": Calibracao(faixa_min=0.6, faixa_max=0.65, lutas=6, acerto=1.0)}, "só houve 6 lutas de teste"),
    ],
)
def test_the_uncertainty_is_honest_when_it_was_not_measured(estado, mudanca, trecho):
    estado["predicao"] = estado["predicao"].model_copy(update=mudanca)
    estado.update(nos.montar_texto(estado))
    assert trecho in estado["texto"]
    assert "acertou" not in estado["texto"]
    assert not erros_de(estado)


def test_a_fifty_percent_without_data_is_not_called_balanced(estado):
    """The factors exist and none weighed: the model knows nothing to tell the two apart by."""
    zerados = tuple(f.model_copy(update={"magnitude": 0.0}) for f in estado["predicao"].fatores)
    estado["predicao"] = estado["predicao"].model_copy(update={"prob_a": 0.5, "prob_b": 0.5, "fatores": zerados})
    estado.update(nos.calcular_fatores(estado))
    estado.update(nos.montar_texto(estado))
    assert "faltam dados para diferenciar" in estado["texto"] and "nenhum fator pesou" in estado["texto"]
    assert "luta equilibrada para" not in estado["texto"] and "acertou" not in estado["texto"]
    assert not erros_de(estado)


def test_no_factor_weighing_does_not_fit_a_prediction_away_from_fifty(estado):
    zerados = tuple(f.model_copy(update={"magnitude": 0.0}) for f in estado["predicao"].fatores)
    estado["predicao"] = estado["predicao"].model_copy(update={"fatores": zerados})
    estado.update(nos.calcular_fatores(estado))
    estado.update(nos.montar_texto(estado))
    assert "nenhum fator" in erros_de(estado)


@pytest.mark.parametrize("valor, texto", [(0.5, "50%"), (0.425, "42%"), (0.575, "57%"), (0.999, "mais de 99%"), (1.0, "mais de 99%"), (0.0, "menos de 1%")])
def test_a_chance_never_reads_as_a_certainty(valor, texto):
    assert textos.pct_chance(valor) == texto


# --------------------------------------------------------------------------- validar_saida


def test_validar_saida_accepts_the_text_the_nodes_write(estado):
    assert nos.validar_saida(estado) == {"validacao": Validacao(ok=True)}
    assert nos.rota_da_validacao({**estado, "validacao": Validacao(ok=True)}) == "ok"


@pytest.mark.parametrize(
    "mudanca, erro",
    [
        ({"prob_b": 0.5}, "não somam 1"),
        ({"prob_a": 1.2, "prob_b": -0.2}, "fora do intervalo"),
        ({"prob_a": math.nan}, "fora do intervalo"),
        ({"favorito": "Outra Pessoa"}, "não é um dos dois"),
        ({"favorito": BIA}, "não é o de maior probabilidade"),
    ],
)
def test_validar_saida_rejects_a_bad_prediction(estado, mudanca, erro):
    estado["predicao"] = estado["predicao"].model_copy(update=mudanca)
    assert any(erro in e for e in erros_de(estado))


@pytest.mark.parametrize("inventado", ["Venceu 87 lutas.", "Chance de 91%.", "Estreou em 01/01/2020.", "Tem 4,37 golpes.", "Tem 15% de algo."])
def test_validar_saida_rejects_a_number_that_is_not_in_the_state(estado, inventado):
    # 15 is in the state as a number of wins: that does not make 15% one of its percentages
    estado["texto"] += f"\n{inventado}"
    assert any("número que não está no estado" in e for e in erros_de(estado))


@pytest.mark.parametrize(
    "frase",
    [
        "Ana Silva vai ganhar.", "Ela vencerá.", "Com certeza.", "É favorita porque bate mais.", "Devido à idade.", "Por causa disso.",
        "Boa aposta.", "Veja as odds.", "Valor: None", "Olá {nome}",
    ],
)
def test_validar_saida_rejects_forbidden_language(estado, frase):
    estado["texto"] += f"\n{frase}"
    assert any("expressão proibida" in e or "resto de template" in e for e in erros_de(estado))


def test_a_name_does_not_trip_the_checks(estado):
    """A digit or a forbidden word inside a name is part of the name."""
    contexto = estado["contexto"]
    forma = (contexto.perfil_a.forma[0].model_copy(update={"adversario": "Todd Odds 77"}),)
    estado["contexto"] = contexto.model_copy(update={"perfil_a": contexto.perfil_a.model_copy(update={"forma": forma})})
    estado.update(nos.montar_texto(estado))
    assert "Todd Odds 77" in estado["texto"]
    assert not erros_de(estado)


@pytest.mark.parametrize("campo", ["fatores", "contexto", "texto"])
def test_validar_saida_rejects_an_empty_required_field(estado, campo):
    del estado[campo]
    assert erros_de(estado)


def test_validar_saida_rejects_a_state_without_a_prediction(estado):
    del estado["predicao"]
    assert erros_de(estado) == ("predição ausente",)


def test_validar_saida_rejects_a_factor_without_a_label(estado):
    estado["fatores"] = [estado["fatores"][0].model_copy(update={"rotulo": "", "coluna": "coluna_nova"})]
    assert "fator sem rótulo: coluna_nova" in erros_de(estado)


def test_validar_saida_rejects_a_factor_for_someone_else(estado):
    estado["fatores"] = [estado["fatores"][0].model_copy(update={"favorece": "Outra Pessoa"})]
    assert any("não está na luta" in e for e in erros_de(estado))


def test_validar_saida_rejects_a_context_of_other_fighters(estado):
    contexto = estado["contexto"]
    estado["contexto"] = contexto.model_copy(update={"perfil_a": contexto.perfil_b})
    assert any("os perfis do contexto" in e for e in erros_de(estado))


def test_validar_saida_rejects_a_score_that_does_not_match_the_meetings(estado):
    contexto = estado["contexto"]
    estado["contexto"] = contexto.model_copy(update={"confronto": contexto.confronto.model_copy(update={"vitorias_a": 2})})
    assert any("placar" in e for e in erros_de(estado))


@pytest.mark.parametrize("retirado, erro", [("sem dado de envergadura e base", "não avisa"), ("Incerteza:", "incerteza"), ("38%", "não mostra 38%")])
def test_validar_saida_rejects_a_text_that_leaves_something_out(estado, retirado, erro):
    estado["texto"] = estado["texto"].replace(retirado, "")
    assert any(erro in e for e in erros_de(estado))


# --------------------------------------------------------------------------- montar_fallback


def test_montar_fallback_writes_a_short_text_that_passes_the_same_checks(estado):
    saida = nos.montar_fallback(estado)
    assert saida["usou_fallback"] is True
    assert "62%" in saida["texto"] and "Incerteza:" in saida["texto"]
    assert "Fatores que mais pesaram" not in saida["texto"]
    assert f"{BIA}: sem dado de envergadura e base." in saida["texto"]
    assert validacao.checar_texto(saida["texto"], estado) == []


def test_montar_fallback_works_without_context(luta, fontes):
    assert "62%" in nos.montar_fallback({"luta": luta, "predicao": fontes.predicao})["texto"]


@pytest.mark.parametrize("predicao", [None, Predicao(prob_a=0.9, prob_b=0.9, favorito=ANA)])
def test_montar_fallback_shows_no_number_for_an_invalid_prediction(luta, predicao):
    texto = nos.montar_fallback({"luta": luta, "predicao": predicao})["texto"]
    assert texto == textos.TEXTO_INDISPONIVEL
    assert not any(caractere.isdigit() for caractere in texto)


def test_montar_fallback_gives_up_when_the_short_text_fails_too(estado, monkeypatch):
    monkeypatch.setattr(textos, "texto_simples", lambda *_: "Ana Silva vai ganhar com 99,9%.")
    assert nos.montar_fallback(estado)["texto"] == textos.TEXTO_INDISPONIVEL
