"""Deterministic checks of an explanation. Pure functions: each returns the list of problems it found."""

from __future__ import annotations

import math
import re

from .estado import EstadoExplicacao, Luta, Predicao
from .textos import TRECHOS_FIXOS, frases_de_dados_ausentes, nomes_citados, numeros_formatados, pct_chance

TOLERANCIA_SOMA = 1e-6
# A date, or a number with its percent sign: "57%" in the text is only matched by a percentage of the state.
_NUMERO = re.compile(r"\d{2}/\d{2}/\d{4}|\d+(?:[.,]\d+)*%?")
_RESTO_DE_TEMPLATE = re.compile(r"[{}]|\b(?:None|nan|inf|null)\b")

# What an explanation must never say: a certainty, a cause, or anything about betting.
_PROIBIDAS = [
    re.compile(padrao, re.IGNORECASE)
    for padrao in (
        r"\b(?:vai|vão|irá|deve) (?:ganhar|vencer|perder|derrotar|nocautear|finalizar)\b",
        r"\b(?:vencerá|ganhará|perderá|derrotará|nocauteará|finalizará)\b",
        r"\b(?:com certeza|certamente|sem dúvida|garantid[oa]s?|impossível)\b",
        r"\b(?:porque|por causa|por isso|devido ao?|devido à|graças ao?|graças à|causou|causa|causam)\b",
        r"\b(?:apost\w*|odds?|bet|bets|betting|stake|palpites?)\b",
    )
]


def checar_predicao(luta: Luta, predicao: Predicao | None) -> list[str]:
    if predicao is None:
        return ["predição ausente"]
    erros = []
    probabilidades = (predicao.prob_a, predicao.prob_b)
    if not all(math.isfinite(p) and 0.0 <= p <= 1.0 for p in probabilidades):
        erros.append("probabilidade fora do intervalo de 0 a 1")
    elif abs(sum(probabilidades) - 1.0) > TOLERANCIA_SOMA:
        erros.append("as probabilidades não somam 1")
    if predicao.favorito not in (luta.lutador_a, luta.lutador_b):
        erros.append("o lado favorecido não é um dos dois lutadores")
    elif not erros:
        do_favorito, do_outro = probabilidades if predicao.favorito == luta.lutador_a else probabilidades[::-1]
        if do_favorito < do_outro - TOLERANCIA_SOMA:
            erros.append("o lado favorecido não é o de maior probabilidade")
    return erros


def checar_campos(estado: EstadoExplicacao) -> list[str]:
    erros = []
    luta = estado["luta"]
    fatores = estado.get("fatores") or []
    if not fatores and not estado["predicao"].sem_base:
        erros.append("nenhum fator")
    for fator in fatores:
        if not fator.rotulo.strip():
            erros.append(f"fator sem rótulo: {fator.coluna}")
        if fator.favorece not in (luta.lutador_a, luta.lutador_b):
            erros.append(f"fator a favor de quem não está na luta: {fator.coluna}")
    contexto = estado.get("contexto")
    if contexto is None:
        erros.append("contexto ausente")
    else:
        if (contexto.perfil_a.nome, contexto.perfil_b.nome) != (luta.lutador_a, luta.lutador_b):
            erros.append("os perfis do contexto não são os dos dois lutadores")
        confronto = contexto.confronto
        if confronto.vitorias_a + confronto.vitorias_b + confronto.sem_vencedor != len(confronto.encontros):
            erros.append("o placar do confronto direto não bate com os encontros")
    if not (estado.get("texto") or "").strip():
        erros.append("texto vazio")
    return erros


def _sem_nomes(texto: str, estado: EstadoExplicacao) -> str:
    """The text without the names it quotes: a name may have a digit, or be a word of the forbidden list."""
    for nome in nomes_citados(estado):
        texto = re.sub(rf"(?<!\w){re.escape(nome)}(?!\w)", "§", texto)
    return texto


def checar_numeros(texto: str, estado: EstadoExplicacao) -> list[str]:
    limpo = _sem_nomes(texto, estado)
    for trecho in TRECHOS_FIXOS:
        limpo = limpo.replace(trecho, "")
    permitidos = {achado for valor in numeros_formatados(estado) for achado in _NUMERO.findall(valor)}
    return [f"número que não está no estado: {achado}" for achado in _NUMERO.findall(limpo) if achado not in permitidos]


def checar_linguagem(texto: str, estado: EstadoExplicacao) -> list[str]:
    limpo = _sem_nomes(texto, estado)
    erros = [f"expressão proibida: {achado.group(0)}" for padrao in _PROIBIDAS for achado in padrao.finditer(limpo)]
    erros += [f"resto de template: {achado.group(0)}" for achado in _RESTO_DE_TEMPLATE.finditer(limpo)]
    return erros


def checar_conteudo(texto: str, estado: EstadoExplicacao) -> list[str]:
    """The text shows both chances, says how uncertain they are, and admits what is missing."""
    luta, predicao, contexto = estado["luta"], estado.get("predicao"), estado.get("contexto")
    erros = [f"o texto não cita {nome}" for nome in (luta.lutador_a, luta.lutador_b) if nome not in texto]
    if "Incerteza:" not in texto:
        erros.append("o texto não fala da incerteza")
    if predicao is not None:
        erros += [f"o texto não mostra {p}" for p in (pct_chance(predicao.prob_a), pct_chance(predicao.prob_b)) if p not in texto]
    if contexto is not None:
        for perfil in (contexto.perfil_a, contexto.perfil_b):
            erros += [f"o texto não avisa: {frase}" for frase in frases_de_dados_ausentes(perfil) if frase not in texto]
    return erros


def checar_texto(texto: str, estado: EstadoExplicacao) -> list[str]:
    return [*checar_numeros(texto, estado), *checar_linguagem(texto, estado), *checar_conteudo(texto, estado)]


def checar_tudo(estado: EstadoExplicacao) -> list[str]:
    erros = checar_predicao(estado["luta"], estado.get("predicao"))
    if erros:
        return erros  # com probabilidade inválida, as outras checagens não teriam o que comparar
    return [*checar_campos(estado), *checar_texto(estado.get("texto") or "", estado)]
