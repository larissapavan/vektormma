"""Fights that were booked and never happened (see cancelled_fights_service).

No `from __future__ import annotations` here, for the reason given in routers/prediction.py."""

from fastapi import APIRouter, Request, Response

from backend.app.dependencies import PredictionServiceGetter, get_prediction_service
from backend.app.rate_limit import limiter
from backend.app.schemas.cancelled_fights import CancelledFightsResponse
from backend.app.services.cancelled_fights_service import get_cancelled_fights


def build_cancelled_fights_router(get_service: PredictionServiceGetter = get_prediction_service) -> APIRouter:
    router = APIRouter(tags=["cancelled-fights"])

    @router.get("/cancelled-fights", response_model=CancelledFightsResponse)
    @limiter.limit("60/minute")
    def cancelled_fights(request: Request, response: Response) -> CancelledFightsResponse:
        response.headers["Cache-Control"] = "public, max-age=3600"
        return CancelledFightsResponse(fights=get_cancelled_fights(get_service()))

    return router
