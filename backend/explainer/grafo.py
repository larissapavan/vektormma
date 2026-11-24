"""The graph: prediction -> factors -> context -> text -> check, and a simpler text when the check fails.

No node calls a language model or the network. LangGraph brings LangSmith along, which can send a trace of every run to
an outside service when LANGSMITH_TRACING is set: explicar_luta turns that off for its own run, whatever the environment says.
"""

from __future__ import annotations

from typing import Any, cast

from langgraph.graph import END, START, StateGraph
from langsmith import tracing_context

from .estado import EstadoExplicacao, Luta
from .fontes import Fontes, FontesDoProjeto
from .nos import (
    Dependencias, buscar_contexto, buscar_predicao, calcular_fatores, montar_fallback, montar_texto, rota_da_validacao, validar_saida,
)


def construir_grafo() -> Any:
    grafo = StateGraph(EstadoExplicacao, context_schema=Dependencias)
    grafo.add_node("buscar_predicao", buscar_predicao)
    grafo.add_node("calcular_fatores", calcular_fatores)
    grafo.add_node("buscar_contexto", buscar_contexto)
    grafo.add_node("montar_texto", montar_texto)
    grafo.add_node("validar_saida", validar_saida)
    grafo.add_node("montar_fallback", montar_fallback)

    grafo.add_edge(START, "buscar_predicao")
    grafo.add_edge("buscar_predicao", "calcular_fatores")
    grafo.add_edge("calcular_fatores", "buscar_contexto")
    grafo.add_edge("buscar_contexto", "montar_texto")
    grafo.add_edge("montar_texto", "validar_saida")
    grafo.add_conditional_edges("validar_saida", rota_da_validacao, {"ok": END, "falhou": "montar_fallback"})
    grafo.add_edge("montar_fallback", END)
    return grafo.compile()


def explicar_luta(lutador_a: str, lutador_b: str, fontes: Fontes | None = None) -> EstadoExplicacao:
    """The final state for a matchup; `texto` is the explanation. Raises LutadorNaoEncontrado or LutaInvalida.

    Without `fontes` the model and the fight history are loaded, which takes a while: reuse one FontesDoProjeto for many fights."""
    dependencias = Dependencias(fontes=fontes if fontes is not None else FontesDoProjeto())
    with tracing_context(enabled=False):
        estado = construir_grafo().invoke({"luta": Luta(lutador_a=lutador_a, lutador_b=lutador_b)}, context=dependencias)
    return cast(EstadoExplicacao, estado)
