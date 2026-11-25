"""Errors reported by the site, and the summary of the last day.

No `from __future__ import annotations` here, for the reason given in routers/prediction.py."""

from fastapi import APIRouter, Request, Response

from backend.app.rate_limit import limiter
from backend.app.schemas.monitor import ClientErrorReport, MonitorSummary
from backend.app.services.monitor_service import monitor

router = APIRouter(tags=["monitor"])


@router.post("/client-errors", status_code=204)
@limiter.limit("20/minute")
def report_client_error(request: Request, payload: ClientErrorReport) -> Response:
    """Writes the error to the log and counts it. Nothing is stored on disk."""
    monitor.client_error(**payload.model_dump())
    return Response(status_code=204)


@router.get("/monitor", response_model=MonitorSummary)
@limiter.limit("30/minute")
def monitor_summary(request: Request, response: Response) -> MonitorSummary:
    response.headers["Cache-Control"] = "no-store"
    return MonitorSummary(**monitor.summary())
