from pydantic import BaseModel


class TrackedFight(BaseModel):
    event_name: str
    event_date: str
    fighter_1: str
    fighter_2: str
    predicted_winner: str
    confidence: float
    winner: str | None = None
    correct: bool


class Scores(BaseModel):
    accuracy: float | None = None
    accuracy_low: float | None = None  # 95% interval of the hit rate
    accuracy_high: float | None = None
    average_confidence: float | None = None
    brier: float | None = None  # saying 50% every time scores 0.25; lower is better


class ConfidenceBand(BaseModel):
    label: str
    fights: int
    average_confidence: float
    accuracy: float
    accuracy_low: float | None = None
    accuracy_high: float | None = None


class TrackedEvent(BaseModel):
    name: str
    date: str
    fights: int
    correct: int


class ModelRecord(Scores):
    """One model's own record, shown once more than one model has made picks."""

    model: str  # "current" | "prefight" | "prefight2"
    label: str
    since: str  # the day of its first saved pick
    logged: int
    resolved: int
    correct: int
    pending: int = 0  # saved picks still without a result


class NextEvent(BaseModel):
    name: str
    date: str


class TrackRecordResponse(Scores):
    tracking_since: str | None = None
    logged: int
    resolved: int
    correct: int
    events: list[TrackedEvent] = []
    pending: int  # fights still to come
    awaiting_result: int = 0  # the day has passed, the result is not in yet
    voided: int = 0  # the fight never took place, moved, or had another saved pick
    earlier_model_picks: int = 0
    earlier_model_note: str | None = None
    model_change_note: str | None = None
    models: list[ModelRecord] = []
    next_event: NextEvent | None = None
    bands: list[ConfidenceBand]
    recent: list[TrackedFight]
    biggest_misses: list[TrackedFight]
