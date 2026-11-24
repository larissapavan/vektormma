"""The graph's nodes: plain functions that read the state and return the fields they fill in.

The data comes from runtime.context.fontes (fontes.py), so a test can hand in its own. The first parameter has to be called
"state": that is the name in LangGraph's protocol for a node, and mypy checks it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from langgraph.runtime import Runtime

from . import textos, validacao
from .estado import MAGNITUDE_MINIMA, Contexto, EstadoExplicacao, Fator, Luta, Validacao
from .fontes import Fontes, LutaInvalida


@dataclass(frozen=True)
class Dependencias:
    fontes: Fontes


def buscar_predicao(state: EstadoExplicacao, runtime: Runtime[Dependencias]) -> dict[str, Any]:
    """Find the two fighters (an unknown one is an error, not a fallback) and ask the existing service for the prediction."""
    fontes = runtime.context.fontes
    luta = Luta(lutador_a=fontes.resolver_nome(state["luta"].lutador_a), lutador_b=fontes.resolver_nome(state["luta"].lutador_b))
    if luta.lutador_a == luta.lutador_b:
        raise LutaInvalida(f"Os dois nomes são da mesma pessoa: {luta.lutador_a}.")
    return {"luta": luta, "predicao": fontes.prever(luta), "usou_fallback": False}


def calcular_fatores(state: EstadoExplicacao) -> dict[str, Any]:
    """The SHAP factors that came with the prediction, largest first, without the ones that did not weigh at all."""
    luta = state["luta"]
    brutos = sorted(state["predicao"].fatores, key=lambda fator: fator.magnitude, reverse=True)
    return {
        "fatores": [
            Fator(
                coluna=bruto.coluna, rotulo=textos.rotulo_do_fator(bruto.coluna, luta), favorece=bruto.favorece,
                magnitude=bruto.magnitude, dado_ausente=bruto.dado_ausente,
            )
            for bruto in brutos
            if bruto.magnitude > MAGNITUDE_MINIMA
        ]
    }


def buscar_contexto(state: EstadoExplicacao, runtime: Runtime[Dependencias]) -> dict[str, Any]:
    fontes, luta = runtime.context.fontes, state["luta"]
    return {
        "contexto": Contexto(
            perfil_a=fontes.perfil(luta.lutador_a), perfil_b=fontes.perfil(luta.lutador_b), confronto=fontes.confronto(luta)
        )
    }


def montar_texto(state: EstadoExplicacao) -> dict[str, Any]:
    # Com predição inválida não há o que escrever; validar_saida acusa o erro e o grafo segue para o fallback.
    if validacao.checar_predicao(state["luta"], state.get("predicao")):
        return {"texto": ""}
    return {"texto": textos.texto_completo(state)}


def validar_saida(state: EstadoExplicacao) -> dict[str, Any]:
    erros = validacao.checar_tudo(state)
    return {"validacao": Validacao(ok=not erros, erros=tuple(erros))}


def rota_da_validacao(state: EstadoExplicacao) -> Literal["ok", "falhou"]:
    return "ok" if state["validacao"].ok else "falhou"


def montar_fallback(state: EstadoExplicacao) -> dict[str, Any]:
    """A shorter text, put through the same checks; if even that one fails, a notice without a single number.

    `validacao` keeps the errors that brought the graph here."""
    luta, predicao, contexto = state["luta"], state.get("predicao"), state.get("contexto")
    if predicao is None or validacao.checar_predicao(luta, predicao):
        texto = textos.TEXTO_INDISPONIVEL
    else:
        texto = textos.texto_simples(luta, predicao, contexto)
        if validacao.checar_texto(texto, state):
            texto = textos.TEXTO_INDISPONIVEL
    return {"texto": texto, "usou_fallback": True}
