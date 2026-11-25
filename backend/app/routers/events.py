from fastapi import APIRouter, Query, Request, Response

from backend.app.rate_limit import limiter
from backend.app.schemas.events import EventSummary
from backend.app.services.events_service import get_events, get_upcoming_events
from backend.app.utils.columns import columns_response, events_to_columns

router = APIRouter(tags=["events"])


@router.get("/events/upcoming", response_model=list[EventSummary])
@limiter.limit("60/minute")
def upcoming_events(request: Request, response: Response) -> list[EventSummary]:
    response.headers["Cache-Control"] = "public, max-age=300"
    return [EventSummary(**event) for event in get_upcoming_events()]


@router.get("/events", response_model=None)
@limiter.limit("60/minute")
def events(
    request: Request,
    response: Response,
    columns: bool = Query(default=False, description="Answer one column per field instead of one object per event and fight (smaller)."),
) -> list[EventSummary] | Response:
    headers = {"Cache-Control": "public, max-age=300"}
    response.headers.update(headers)
    found = [EventSummary(**event) for event in get_events()]
    return columns_response(events_to_columns([event.model_dump() for event in found]), headers) if columns else found
