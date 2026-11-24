"""Where the explanation's data comes from: the only file of this package that touches the existing services.

A value that only looks like data becomes None here, so that the text can say it is missing:
    - the "Orthodox" every profile from another organization gets, and the catalog's "Unknown" stance;
    - a 0-0 record;
    - the zeros of a fighter with no striking numbers, and a 0% takedown accuracy with no takedown behind it.
"""

from __future__ import annotations

import difflib
import math
import re
import unicodedata
from datetime import date
from typing import Any, Protocol

import pandas as pd

from backend.app.services.catalog_service import canonical_name, get_fighter_catalog, get_fighter_profile
from backend.app.services.fight_history_service import get_fights_for_fighter, get_head_to_head
from backend.app.services.org_service import ORGS
from backend.app.services.prediction_service import EASED_ORIGINS, PredictionService, pretty_feature_name
from backend.app.services.prefight_service import build_prediction_service

from .estado import Calibracao, ConfrontoDireto, Encontro, FatorBruto, Luta, LutaRecente, Perfil, Predicao, Resultado

LUTAS_DA_FORMA = 5
_FAIXA = re.compile(r"^(\d+)%-(\d+)%$")
_RESULTADOS: dict[str | None, Resultado] = {"win": "vitoria", "loss": "derrota", None: "sem_vencedor"}
# The earlier model fills these in with a fixed value before the row is built, so a missing one is not NaN in it.
_PREENCHIDOS_PELO_MODELO_ANTERIOR = ("age", "height_cm", "reach_cm", "sig_str_acc", "takedown_acc")


class LutadorNaoEncontrado(LookupError):
    pass


class LutaInvalida(ValueError):
    pass


class Fontes(Protocol):
    def resolver_nome(self, nome: str) -> str: ...

    def prever(self, luta: Luta) -> Predicao: ...

    def perfil(self, nome: str) -> Perfil: ...

    def confronto(self, luta: Luta) -> ConfrontoDireto: ...


# --------------------------------------------------------------------------- pure conversions


def chave(nome: str) -> str:
    """A name without accents, capitals or punctuation."""
    texto = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode("ascii").lower()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", texto).split())


def _numero(valor: object) -> float | None:
    if not isinstance(valor, (int, float)) or isinstance(valor, bool) or not math.isfinite(valor):
        return None
    return float(valor)


def _positivo(valor: object) -> float | None:
    convertido = _numero(valor)
    return convertido if convertido is not None and convertido > 0 else None


def _dia(valor: object) -> date | None:
    try:
        return date.fromisoformat(str(valor)[:10])
    except ValueError:
        return None


def converter_perfil(perfil: dict[str, Any], lutas: list[dict[str, Any]]) -> Perfil:
    """A catalog or organization profile (get_fighter_profile) and the UFC fights (most recent first) as a Perfil."""
    origem = perfil.get("data_origin")
    tem_recorde = any(_positivo(perfil.get(campo)) for campo in ("wins", "losses", "draws"))
    tem_golpes = _positivo(perfil.get("sig_str_acc")) is not None or _positivo(perfil.get("sig_strikes_landed_per_min")) is not None
    stance = str(perfil.get("stance") or "").strip()

    def golpe(campo: str) -> float | None:
        return _numero(perfil.get(campo)) if tem_golpes else None

    quedas = golpe("takedown_avg_per_15min")
    return Perfil(
        nome=perfil["name"],
        organizacao=ORGS[origem].short_name if origem in ORGS else (str(origem) if origem else "UFC"),
        vitorias=int(perfil["wins"]) if tem_recorde else None,
        derrotas=int(perfil["losses"]) if tem_recorde else None,
        empates=int(perfil["draws"]) if tem_recorde else None,
        idade=_positivo(perfil.get("age")),
        altura_cm=_positivo(perfil.get("height_cm")),
        envergadura_cm=_positivo(perfil.get("reach_cm")),
        base=None if origem or stance in ("", "Unknown") else stance,
        golpes_por_minuto=golpe("sig_strikes_landed_per_min"),
        golpes_recebidos_por_minuto=golpe("sig_strikes_absorbed_per_min"),
        precisao_golpes=golpe("sig_str_acc"),
        quedas_por_15_min=quedas,
        # Sem queda aplicada, 0% tanto pode ser "tentou e errou" como "nunca tentou": os dados não separam os dois.
        precisao_quedas=golpe("takedown_acc") if quedas else _positivo(perfil.get("takedown_acc")),
        lutas_ufc=len(lutas),
        forma=tuple(
            LutaRecente(
                data=_dia(luta.get("date")), adversario=luta["opponent"], resultado=_RESULTADOS[luta.get("result")], metodo=luta.get("method")
            )
            for luta in lutas[:LUTAS_DA_FORMA]
        ),
    )


def converter_confronto(confronto: dict[str, Any], luta: Luta) -> ConfrontoDireto:
    """get_head_to_head's answer (asked as A against B). What it calls no_contests also counts draws: nobody won."""
    vencedores = {"win": luta.lutador_a, "loss": luta.lutador_b}
    return ConfrontoDireto(
        vitorias_a=confronto["fighter_a_wins"],
        vitorias_b=confronto["fighter_b_wins"],
        sem_vencedor=confronto["no_contests"],
        encontros=tuple(
            Encontro(data=_dia(encontro.get("date")), vencedor=vencedores.get(encontro.get("result") or ""), metodo=encontro.get("method"))
            for encontro in confronto["meetings"]
        ),
    )


def escolher_calibracao(avaliacao: dict[str, Any] | None, probabilidade: float) -> Calibracao | None:
    """The row of the model's measured calibration this probability falls in, or None when there is none."""
    for linha in (avaliacao or {}).get("calibration") or []:
        faixa = _FAIXA.match(str(linha.get("label", "")))
        if faixa is None:
            continue
        minimo, maximo = int(faixa[1]) / 100, int(faixa[2]) / 100
        if minimo <= probabilidade < maximo or probabilidade == maximo == 1.0:
            return Calibracao(faixa_min=minimo, faixa_max=maximo, lutas=int(linha["fights"]), acerto=float(linha["accuracy"]))
    return None


# --------------------------------------------------------------------------- the real sources


class FontesDoProjeto:
    """The project's prediction service and data files."""

    def __init__(self, servico: PredictionService | None = None) -> None:
        self._servico = servico if servico is not None else build_prediction_service()
        self._nomes_ufc = {chave(nome): nome for nome in get_fighter_catalog()["name"]}

    def resolver_nome(self, nome: str) -> str:
        """The name as the data writes it, ignoring accents and capitals.

        get_fighter_profile compares exactly and, when a name is not in the catalog, looks for it in the other
        organizations: "alex pereira" would be the fighter of an LFA file. Here a UFC fighter always comes first."""
        oficial = self._nomes_ufc.get(chave(canonical_name(nome) or nome))
        if oficial is not None:
            return oficial
        try:
            return get_fighter_profile(nome)["name"]
        except KeyError:
            parecidos = difflib.get_close_matches(chave(nome), list(self._nomes_ufc), n=3, cutoff=0.75)
            dica = f" Nomes parecidos: {', '.join(self._nomes_ufc[parecido] for parecido in parecidos)}." if parecidos else ""
            raise LutadorNaoEncontrado(f"Não encontrei '{nome}' nos dados do projeto.{dica}") from None

    def prever(self, luta: Luta) -> Predicao:
        resultado = self._servico.predict_matchup(luta.lutador_a, luta.lutador_b)
        perfis = (resultado["fighter_a_profile"], resultado["fighter_b_profile"])
        # A tabela de acerto foi medida só com lutas do UFC: não vale para um perfil de outra organização.
        de_fora = any(perfil.get("data_origin") for perfil in perfis)
        colunas = {pretty_feature_name(coluna): coluna for coluna in self._servico.feature_columns}
        ausentes = self._colunas_sem_dado(*perfis)
        return Predicao(
            prob_a=resultado["fighter_a_probability"],
            prob_b=resultado["fighter_b_probability"],
            favorito=resultado["predicted_winner"],
            suavizada=any(perfil.get("data_origin") in EASED_ORIGINS for perfil in perfis),
            calibracao=None if de_fora else escolher_calibracao(self._servico.recent_evaluation, resultado["probability"]),
            fatores=tuple(
                FatorBruto(
                    coluna=colunas[fator["feature"]], favorece=fator["impact"], magnitude=fator["magnitude"],
                    dado_ausente=colunas[fator["feature"]] in ausentes,
                )
                for fator in resultado["main_factors"]
            ),
        )

    def _colunas_sem_dado(self, perfil_a: dict[str, Any], perfil_b: dict[str, Any]) -> set[str]:
        """Model columns where a fighter had no value, so the model read a typical one.

        Reads the row through _both_orders, which is private: no public method shows the model's input. This is the only
        place of the package that does, and tests/explainer checks it against the real service."""
        linha, _ = self._servico._both_orders(perfil_a, perfil_b)
        ausentes = {str(coluna) for coluna in linha.columns if linha[coluna].isna().any()}
        if self._servico.model_key == "current":
            for campo in _PREENCHIDOS_PELO_MODELO_ANTERIOR:
                donos = [prefixo for prefixo, perfil in (("red", perfil_a), ("blue", perfil_b)) if pd.isna(perfil.get(campo))]
                if donos:
                    ausentes |= {f"{campo}_diff", f"{campo}_sum", *(f"{prefixo}_{campo}" for prefixo in donos)}
        return ausentes

    def perfil(self, nome: str) -> Perfil:
        return converter_perfil(get_fighter_profile(nome), get_fights_for_fighter(nome))

    def confronto(self, luta: Luta) -> ConfrontoDireto:
        return converter_confronto(get_head_to_head(luta.lutador_a, luta.lutador_b), luta)
