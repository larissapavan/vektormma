"""The compiled graph and the command line, with made-up data."""

import importlib
import subprocess
import sys
from pathlib import Path

import pytest
from langsmith import utils as langsmith_utils

from backend.explainer import textos
from backend.explainer.estado import Luta
from backend.explainer.fontes import LutadorNaoEncontrado, LutaInvalida
from backend.explainer.grafo import construir_grafo, explicar_luta
from backend.explainer.nos import Dependencias
from scripts import explain_prediction

ANA, BIA = "Ana Silva", "Bia Costa"
CAMINHO_OK = ["buscar_predicao", "calcular_fatores", "buscar_contexto", "montar_texto", "validar_saida"]


def percorrer(fontes) -> list[str]:
    """The nodes the graph ran, in order."""
    passos = construir_grafo().stream(
        {"luta": Luta(lutador_a=ANA, lutador_b=BIA)}, context=Dependencias(fontes=fontes), stream_mode="updates"
    )
    return [no for passo in passos for no in passo]


def test_a_good_explanation_ends_after_the_check(fontes):
    assert percorrer(fontes) == CAMINHO_OK
    estado = explicar_luta(ANA, BIA, fontes)
    assert estado["validacao"].ok and estado["usou_fallback"] is False
    assert "62%" in estado["texto"]


def test_without_factors_the_graph_takes_the_fallback(fontes):
    """What happens when SHAP is not available: the service then gives no factors."""
    fontes.predicao = fontes.predicao.model_copy(update={"fatores": ()})
    assert percorrer(fontes) == [*CAMINHO_OK, "montar_fallback"]
    estado = explicar_luta(ANA, BIA, fontes)
    assert estado["usou_fallback"] is True
    assert estado["validacao"].erros == ("nenhum fator",)
    assert "62%" in estado["texto"] and "versão curta" in estado["texto"]


def test_with_invalid_probabilities_the_fallback_has_no_number(fontes):
    fontes.predicao = fontes.predicao.model_copy(update={"prob_a": 0.62, "prob_b": 0.62})
    assert percorrer(fontes) == [*CAMINHO_OK, "montar_fallback"]
    estado = explicar_luta(ANA, BIA, fontes)
    assert estado["texto"] == textos.TEXTO_INDISPONIVEL
    assert "as probabilidades não somam 1" in estado["validacao"].erros


def test_a_text_with_an_invented_number_takes_the_fallback(fontes, monkeypatch):
    original = textos.texto_completo
    monkeypatch.setattr(textos, "texto_completo", lambda estado: original(estado) + "\nTem 777 vitórias.")
    estado = explicar_luta(ANA, BIA, fontes)
    assert estado["usou_fallback"] is True
    assert "777" not in estado["texto"]
    assert estado["validacao"].erros == ("número que não está no estado: 777",)


def test_the_same_fight_gives_the_same_text(fontes):
    assert explicar_luta(ANA, BIA, fontes)["texto"] == explicar_luta("ana silva", "bia costa", fontes)["texto"]


def test_an_unknown_fighter_and_a_fight_with_oneself_are_errors(fontes):
    with pytest.raises(LutadorNaoEncontrado):
        explicar_luta(ANA, "Zé Ninguém", fontes)
    with pytest.raises(LutaInvalida):
        explicar_luta(ANA, ANA, fontes)


def test_no_trace_is_sent_even_when_the_environment_asks_for_one(fontes, monkeypatch):
    monkeypatch.setenv("LANGSMITH_TRACING", "true")
    langsmith_utils.get_env_var.cache_clear()
    visto = []
    original = fontes.prever

    def prever(luta):
        visto.append(langsmith_utils.tracing_is_enabled())
        return original(luta)

    monkeypatch.setattr(fontes, "prever", prever)
    try:
        assert langsmith_utils.tracing_is_enabled()  # the environment does turn it on outside of explicar_luta
        explicar_luta(ANA, BIA, fontes)
    finally:
        monkeypatch.undo()
        langsmith_utils.get_env_var.cache_clear()
    assert visto == [False]


def test_the_api_does_not_import_the_explainer():
    """langgraph is not in backend/requirements.txt, so importing it from the API would take the site down."""
    codigo = "import sys, backend.app.main; sys.exit(any(m.split('.')[0] in ('langgraph', 'langsmith') for m in sys.modules))"
    raiz = Path(__file__).resolve().parents[2]
    assert subprocess.run([sys.executable, "-c", codigo], cwd=raiz, timeout=120).returncode == 0


# --------------------------------------------------------------------------- command line


@pytest.fixture
def cli(fontes, monkeypatch):
    modulo = importlib.import_module("backend.explainer.grafo")
    monkeypatch.setattr(explain_prediction, "explicar_luta", lambda a, b: modulo.explicar_luta(a, b, fontes))
    return explain_prediction.main


def test_cli_prints_the_explanation(cli, capsys):
    assert cli(["ana silva", "bia costa"]) == 0
    saida = capsys.readouterr()
    assert saida.out.startswith(f"{ANA} x {BIA}\n")
    assert saida.err == ""


def test_cli_says_why_the_short_text_was_used(cli, fontes, capsys):
    fontes.predicao = fontes.predicao.model_copy(update={"fatores": ()})
    assert cli([ANA, BIA, "--verbose"]) == 0
    saida = capsys.readouterr()
    assert "versão curta" in saida.out
    assert "nenhum fator" in saida.err


@pytest.mark.parametrize("nomes, mensagem", [([ANA, "Zé Ninguém"], "Não encontrei"), ([ANA, ANA], "mesma pessoa"), ([ANA, " "], "Informe")])
def test_cli_refuses_a_fight_it_cannot_explain(cli, capsys, nomes, mensagem):
    assert cli(nomes) == 2
    saida = capsys.readouterr()
    assert mensagem in saida.err
    assert saida.out == ""
