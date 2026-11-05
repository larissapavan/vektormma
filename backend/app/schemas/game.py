from typing import Literal

from pydantic import BaseModel, Field

GAME_DIVISIONS = (
    "Flyweight",
    "Bantamweight",
    "Featherweight",
    "Lightweight",
    "Welterweight",
    "Middleweight",
    "Light Heavyweight",
    "Heavyweight",
    "Women's Strawweight",
    "Women's Flyweight",
    "Women's Bantamweight",
)


class GameFighter(BaseModel):
    """The character the visitor builds. Skills are percentiles (0 to 100) among real UFC fighters; the API turns them into
    the striking and takedown accuracy, reach and height the model reads."""

    striking: float = Field(..., ge=0, le=100)
    takedowns: float = Field(..., ge=0, le=100)
    reach: float = Field(..., ge=0, le=100)
    age: float = Field(..., ge=18, le=50)
    wins: int = Field(..., ge=0, le=200)
    losses: int = Field(..., ge=0, le=200)
    draws: int = Field(0, ge=0, le=50)
    stance: Literal["Orthodox", "Southpaw", "Switch"] = "Orthodox"


class MatchmakingRequest(BaseModel):
    fighter: GameFighter
    division: Literal[GAME_DIVISIONS]  # type: ignore[valid-type]
    # A title shot: the only opponent offered is the division's champion.
    title: bool = False
    # Opponents to leave out (the ones already fought) or, in `names`, the only ones to score (a rematch).
    exclude: list[str] = Field(default_factory=list, max_length=60)
    names: list[str] = Field(default_factory=list, max_length=3)
    seed: int = Field(0, ge=0, le=2**31 - 1)


class GameOpponent(BaseModel):
    # safe | even | risk (how the odds compare), champion (a title shot) or rematch (named by the caller)
    label: str
    name: str
    image_url: str | None = None
    country_code: str | None = None
    record: str
    age: float | None = None
    reach_cm: float | None = None
    stance: str | None = None
    ranking: str | None = None
    champion: bool = False
    sig_str_acc: float | None = None
    takedown_acc: float | None = None
    win_probability: float


class PlayerStats(BaseModel):
    height_cm: float
    reach_cm: float
    sig_str_acc: float
    takedown_acc: float


class MatchmakingResponse(BaseModel):
    player: PlayerStats
    opponents: list[GameOpponent]
