from __future__ import annotations

from pydantic import BaseModel


class FighterPick(BaseModel):
    date: str
    opponent: str
    chance: float  # what the model gave this fighter
    won: bool
    correct: bool


class RecordSummary(BaseModel):
    fights: int
    correct: int
    accuracy_low: float | None = None  # 95% interval of the hit rate
    accuracy_high: float | None = None
    wins: int
    expected_wins: float  # the sum of the chances the model gave


class FighterRecord(RecordSummary):
    picks: list[FighterPick]


class ModelRecordResponse(BaseModel):
    """The model on one fighter's fights: the back-test and the live picks, never added together."""

    fighter: str
    start: str | None = None  # the days the back-test covers
    end: str | None = None
    backtest: FighterRecord | None = None
    live: FighterRecord | None = None


class SurpriseRow(RecordSummary):
    fighter: str


class SurprisesResponse(BaseModel):
    fighters: int  # how many have enough test fights to be listed
    min_fights: int
    start: str | None = None
    end: str | None = None
    underrated: list[SurpriseRow]
    overrated: list[SurpriseRow]
