"""The career game's matchmaking (see game_service).

No `from __future__ import annotations` here, for the reason given in routers/prediction.py."""

from fastapi import APIRouter, HTTPException, Request

from backend.app.dependencies import PredictionServiceGetter, get_prediction_service
from backend.app.rate_limit import limiter
from backend.app.schemas.game import MatchmakingRequest, MatchmakingResponse
from backend.app.services.game_service import matchmake


def build_game_router(get_service: PredictionServiceGetter = get_prediction_service) -> APIRouter:
    router = APIRouter(tags=["game"])

    @router.post("/game/matchmaking", response_model=MatchmakingResponse)
    @limiter.limit("40/minute")
    def matchmaking(request: Request, payload: MatchmakingRequest) -> MatchmakingResponse:
        service = get_service()
        if service is None:
            raise HTTPException(status_code=503, detail="Prediction service not initialized")
        return MatchmakingResponse(**matchmake(service, payload.model_dump()))

    return router
