"""The state the graph's nodes share.

The graph itself runs on a TypedDict, which is what LangGraph's documentation recommends (with a Pydantic state it would
validate only the input of the first node). What goes inside it are Pydantic models, validated when a node creates them.

A value the project does not have is None. It is never replaced by a default.
"""

from __future__ import annotations

from datetime import date
from typing import Literal, TypedDict

from pydantic import BaseModel, ConfigDict, Field

MAGNITUDE_MINIMA = 1e-9  # a factor below this did not weigh at all
MARGEM_SEM_BASE = 0.01

Resultado = Literal["vitoria", "derrota", "sem_vencedor"]


class _Modelo(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")


class Luta(_Modelo):
    lutador_a: str = Field(min_length=1)
    lutador_b: str = Field(min_length=1)


class FatorBruto(_Modelo):
    """A factor as the prediction service gives it, with the model column it came from."""

    coluna: str
    favorece: str
    magnitude: float
    dado_ausente: bool = False  # a fighter had no value for it, so the model read a typical value instead


class Calibracao(_Modelo):
    """How often the model was right on past fights, for picks as confident as this one."""

    faixa_min: float
    faixa_max: float
    lutas: int
    acerto: float


# As faixas das probabilidades não são validadas aqui de propósito: quem decide o que fazer com um valor inválido é o nó
# validar_saida, que tem um caminho de fallback.
class Predicao(_Modelo):
    prob_a: float
    prob_b: float
    favorito: str
    suavizada: bool = False  # pulled toward 50% because a fighter comes from outside the UFC
    calibracao: Calibracao | None = None
    fatores: tuple[FatorBruto, ...] = ()

    @property
    def sem_base(self) -> bool:
        """The service looked at the factors and none weighed, so its 50% says that data is missing, not that the fight is even.

        It is what the model gives two fighters it knows nothing to tell apart by (neither has UFC fights, an age is missing).
        No factors at all is something else: the explanation could not be made."""
        nenhum_pesou = bool(self.fatores) and all(fator.magnitude <= MAGNITUDE_MINIMA for fator in self.fatores)
        return nenhum_pesou and abs(self.prob_a - 0.5) < MARGEM_SEM_BASE


class Fator(_Modelo):
    coluna: str
    rotulo: str
    favorece: str
    magnitude: float  # SHAP, before calibration. Kept for whoever reads the state: the text shows only order and direction
    dado_ausente: bool = False


class LutaRecente(_Modelo):
    data: date | None
    adversario: str
    resultado: Resultado
    metodo: str | None = None


class Perfil(_Modelo):
    nome: str
    organizacao: str
    vitorias: int | None = None
    derrotas: int | None = None
    empates: int | None = None
    idade: float | None = None
    altura_cm: float | None = None
    envergadura_cm: float | None = None
    base: str | None = None
    golpes_por_minuto: float | None = None
    golpes_recebidos_por_minuto: float | None = None
    precisao_golpes: float | None = None
    quedas_por_15_min: float | None = None
    precisao_quedas: float | None = None
    lutas_ufc: int = 0
    forma: tuple[LutaRecente, ...] = ()  # UFC fights, most recent first


class Encontro(_Modelo):
    data: date | None
    vencedor: str | None  # None: a draw, a no contest or an overturned result
    metodo: str | None = None


class ConfrontoDireto(_Modelo):
    vitorias_a: int = 0
    vitorias_b: int = 0
    sem_vencedor: int = 0
    encontros: tuple[Encontro, ...] = ()  # most recent first


class Contexto(_Modelo):
    perfil_a: Perfil
    perfil_b: Perfil
    confronto: ConfrontoDireto


class Validacao(_Modelo):
    ok: bool
    erros: tuple[str, ...] = ()


class EstadoExplicacao(TypedDict, total=False):
    luta: Luta
    predicao: Predicao
    fatores: list[Fator]
    contexto: Contexto
    texto: str
    validacao: Validacao
    usou_fallback: bool
