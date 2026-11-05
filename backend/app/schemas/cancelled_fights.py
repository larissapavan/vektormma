from pydantic import BaseModel


class CancelledFighter(BaseModel):
    name: str
    # The fighter's name in our catalog when we have a profile for them (the page links these to the profile).
    profile_name: str | None = None
    image_url: str | None = None
    country_code: str | None = None
    record: str | None = None  # "29-3-0": the career record on file today, not the one at the time of the booking
    ufc_status: str | None = None  # "active" | "former" | "never"


class CancelledModelPick(BaseModel):
    predicted_winner: str
    probability: float
    fighter_1_probability: float


class CancelledFight(BaseModel):
    id: str
    fighter_1: CancelledFighter
    fighter_2: CancelledFighter
    weight_class: str
    title_fight: bool
    rounds: int | None = None
    event_name: str
    event_date: str
    # Why it fell through: injury | missed_weight | travel_restrictions | event_cancelled | other
    reason: str
    withdrew: str | None = None
    # How many times the same fight was booked and called off (the Khabib-Ferguson saga counts five).
    attempts: int = 1
    source_url: str | None = None
    # The model's pick, only when both fighters are still active: its numbers describe a fighter as they are today.
    model: CancelledModelPick | None = None


class CancelledFightsResponse(BaseModel):
    fights: list[CancelledFight]
