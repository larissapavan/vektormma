from pydantic import BaseModel


class DataInfoResponse(BaseModel):
    last_updated: str | None = None
    fighters_count: int
    events_count: int
    fights_count: int
    sources: list[str]


class SourceRefresh(BaseModel):
    source: str
    last_success: str | None = None  # ISO day (UTC)
    failing_since: str | None = None  # the first failed refresh after the last good one


class SiteDataInfoResponse(DataInfoResponse):
    """The whole site's: an organization's page only has its own counts and date."""

    latest_fight_date: str | None = None  # the newest fight with a result (UFC)
    refresh: list[SourceRefresh] = []
