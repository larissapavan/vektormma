"""Small made-up data for the explainer: no model is loaded, except by test_explainer_real_data.py."""

from datetime import date
from types import SimpleNamespace

import pytest

from backend.explainer.estado import (
    Calibracao, ConfrontoDireto, Encontro, FatorBruto, Luta, LutaRecente, Perfil, Predicao,
)
from backend.explainer.fontes import LutadorNaoEncontrado
from backend.explainer.nos import Dependencias

ANA, BIA = "Ana Silva", "Bia Costa"


class FontesFalsas:
    """Stands in for FontesDoProjeto. A test changes an attribute to change what the graph reads."""

    def __init__(self) -> None:
        self.predicao = Predicao(
            prob_a=0.62,
            prob_b=0.38,
            favorito=ANA,
            calibracao=Calibracao(faixa_min=0.60, faixa_max=0.65, lutas=336, acerto=0.6369),
            fatores=(
                FatorBruto(coluna="reach_diff", favorece=BIA, magnitude=0.02),
                FatorBruto(coluna="elo_diff", favorece=ANA, magnitude=0.07),
                FatorBruto(coluna="td_acc_diff", favorece=ANA, magnitude=0.01, dado_ausente=True),
                FatorBruto(coluna="womens", favorece=ANA, magnitude=0.0),
            ),
        )
        self.perfis = {
            ANA: Perfil(
                nome=ANA, organizacao="UFC", vitorias=15, derrotas=3, empates=0, idade=29.7, altura_cm=170.0, envergadura_cm=172.5,
                base="Orthodox", golpes_por_minuto=4.36, golpes_recebidos_por_minuto=2.55, precisao_golpes=0.52, quedas_por_15_min=2.66,
                precisao_quedas=0.54, lutas_ufc=2,
                forma=(
                    LutaRecente(data=date(2026, 5, 2), adversario="Cris 100 Dias", resultado="vitoria", metodo="SUB"),
                    LutaRecente(data=date(2025, 11, 8), adversario=BIA, resultado="derrota", metodo="U-DEC"),
                ),
            ),
            BIA: Perfil(
                nome=BIA, organizacao="UFC", vitorias=12, derrotas=4, empates=1, idade=33.2, altura_cm=168.0, envergadura_cm=None, base=None,
                golpes_por_minuto=3.1, golpes_recebidos_por_minuto=3.4, precisao_golpes=0.45, quedas_por_15_min=1.0, precisao_quedas=0.4,
                lutas_ufc=1, forma=(LutaRecente(data=date(2025, 11, 8), adversario=ANA, resultado="vitoria", metodo="U-DEC"),),
            ),
        }
        self.confronto_direto = ConfrontoDireto(
            vitorias_b=1, encontros=(Encontro(data=date(2025, 11, 8), vencedor=BIA, metodo="U-DEC"),)
        )

    def resolver_nome(self, nome: str) -> str:
        for conhecido in self.perfis:
            if conhecido.lower() == nome.lower():
                return conhecido
        raise LutadorNaoEncontrado(f"Não encontrei '{nome}' nos dados do projeto.")

    def prever(self, luta: Luta) -> Predicao:
        return self.predicao

    def perfil(self, nome: str) -> Perfil:
        return self.perfis[nome]

    def confronto(self, luta: Luta) -> ConfrontoDireto:
        return self.confronto_direto


@pytest.fixture
def fontes() -> FontesFalsas:
    return FontesFalsas()


@pytest.fixture
def runtime(fontes):
    """What a node reads of LangGraph's Runtime."""
    return SimpleNamespace(context=Dependencias(fontes=fontes))


@pytest.fixture
def luta() -> Luta:
    return Luta(lutador_a=ANA, lutador_b=BIA)


@pytest.fixture
def estado(luta, runtime):
    """The state as it is when validar_saida runs, built by the nodes themselves."""
    from backend.explainer import nos

    atual = {"luta": luta}
    atual.update(nos.buscar_predicao(atual, runtime))
    atual.update(nos.calcular_fatores(atual))
    atual.update(nos.buscar_contexto(atual, runtime))
    atual.update(nos.montar_texto(atual))
    return atual
