from pydantic import BaseModel


class ResultPick(BaseModel):
    """What the model said before the fight (data/raw/prediction_log.csv), and whether it was right."""

    predicted_winner: str
    confidence: float
    correct: bool | None = None  # None until the fight has a winner


class ResultFight(BaseModel):
    fighter_1: str
    fighter_2: str
    winner: str | None = None
    outcome: str  # "win" | "draw" | "no_contest" | "pending"
    weight_class: str | None = None
    stage: str | None = None
    method: str | None = None
    method_detail: str | None = None
    round: int | None = None
    time: str | None = None
    title_fight: bool | None = None
    discipline: str | None = None
    pick: ResultPick | None = None


class ResultEvent(BaseModel):
    org_id: str
    org_name: str
    name: str
    date: str
    location: str | None = None
    fights: list[ResultFight]
    decided: int  # bouts with a result
    total: int


class RecentResultsResponse(BaseModel):
    since: str
    until: str
    events: list[ResultEvent]
    picks_resolved: int  # fights shown that have both a pick and a winner
    picks_correct: int
