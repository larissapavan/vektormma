from __future__ import annotations

from pydantic import BaseModel

from backend.app.schemas.events import EventSummary, FightResult
from backend.app.schemas.rankings import RankingCategory, RankingEntry


class OrgInfo(BaseModel):
    id: str
    name: str
    short_name: str
    tagline: str
    sources: list[str]


class NextFight(BaseModel):
    event: str
    date: str | None = None
    opponent: str


class OrgSeasonStats(BaseModel):
    """What an organization prints for one fighter in one season, as it prints it. The tallies are "landed/attempted"
    ("76/144"); they are the organization's own counts and are not comparable to the UFC's significant strikes."""

    season: int
    max_punch_speed_mph: str | None = None
    strikes: str | None = None
    arm_strikes: str | None = None
    leg_strikes: str | None = None
    ground_strikes: str | None = None
    takedowns: str | None = None
    inner_zone_pct: str | None = None
    outer_zone_pct: str | None = None


class OrgFighter(BaseModel):
    """A fighter of an organisation other than the UFC (data/raw/<org>/fighters.csv)."""

    name: str
    nickname: str | None = None
    is_active: bool = False
    age: float | None = None
    height_cm: float | None = None
    weight_lbs: float | None = None
    reach_cm: float | None = None
    leg_reach_cm: float | None = None
    wins: int | None = None
    losses: int | None = None
    draws: int | None = None
    no_contests: int | None = None
    total_fights: int | None = None
    win_rate: float | None = None
    division: str | None = None
    belt: bool = False
    title_status: str | None = None
    ranking: str | None = None
    image_url: str | None = None
    profile_url: str | None = None
    hometown: str | None = None
    country: str | None = None
    country_code: str | None = None
    camp: str | None = None
    fighting_out_of: str | None = None
    circuit: str | None = None
    org_record: str | None = None
    ufc_name: str | None = None  # the UFC profile of the same person, when they have fought in the UFC too
    org_fights: int = 0
    first_fight_date: str | None = None
    last_fight_date: str | None = None
    next_fight: NextFight | None = None
    season_stats: list[OrgSeasonStats] = []  # newest season first; empty for an organization that prints none


class OrgFight(FightResult):
    stage: str | None = None
    discipline: str | None = None  # "MMA", "Muay Thai", "Kickboxing"...: only where the source says it


class OrgEvent(EventSummary):
    slug: str | None = None
    circuit: str | None = None
    fights: list[OrgFight]  # type: ignore[assignment]  # narrows the parent's field to a subclass of its items


class OrgRankingEntry(RankingEntry):
    status: str | None = None


class OrgRankingCategory(RankingCategory):
    entries: list[OrgRankingEntry]  # type: ignore[assignment]  # narrows the parent's field to a subclass of its items


__all__ = [
    "NextFight", "OrgEvent", "OrgFight", "OrgFighter", "OrgInfo", "OrgRankingCategory", "OrgRankingEntry", "RankingCategory",
]
