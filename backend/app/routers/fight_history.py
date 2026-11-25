from fastapi import APIRouter, HTTPException, Query, Request, Response

from backend.app.rate_limit import limiter
from backend.app.schemas.fight_history import FighterPerformance, HeadToHeadResponse, OpponentsResponse, OtherOrganization
from backend.app.schemas.model_record import ModelRecordResponse, SurprisesResponse
from backend.app.services.catalog_service import get_fighter_profile
from backend.app.services.crossorg_service import other_organizations
from backend.app.services.fight_history_service import (
    get_fighter_performance,
    get_head_to_head,
    get_opponents,
)
from backend.app.services.model_record_service import get_model_record, get_surprises

router = APIRouter(tags=["fight-history"])


@router.get("/head-to-head", response_model=HeadToHeadResponse)
@limiter.limit("60/minute")
def head_to_head(
    request: Request,
    response: Response,
    fighter_a: str = Query(..., min_length=1, max_length=80),
    fighter_b: str = Query(..., min_length=1, max_length=80),
) -> HeadToHeadResponse:
    # Validate both names exist in the catalog before searching fight history,
    # so a typo returns a clear 404 instead of a silent "0 meetings" result.
    try:
        # The catalog spelling: the fight history does not ignore accents as the profile lookup does.
        fighter_a = get_fighter_profile(fighter_a)["name"]
        fighter_b = get_fighter_profile(fighter_b)["name"]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    response.headers["Cache-Control"] = "public, max-age=300"
    return HeadToHeadResponse(**get_head_to_head(fighter_a, fighter_b))


@router.get("/fighters/{name}/performance", response_model=FighterPerformance)
@limiter.limit("60/minute")
def fighter_performance(request: Request, response: Response, name: str) -> FighterPerformance:
    try:
        name = get_fighter_profile(name)["name"]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    response.headers["Cache-Control"] = "public, max-age=300"
    return FighterPerformance(**get_fighter_performance(name))


@router.get("/fighters/{name}/opponents", response_model=OpponentsResponse)
@limiter.limit("60/minute")
def fighter_opponents(request: Request, response: Response, name: str) -> OpponentsResponse:
    try:
        name = get_fighter_profile(name)["name"]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    response.headers["Cache-Control"] = "public, max-age=300"
    return OpponentsResponse(fighter=name, opponents=get_opponents(name))  # type: ignore[arg-type]  # pydantic validates the dicts


@router.get("/fighters/{name}/other-organizations", response_model=list[OtherOrganization])
@limiter.limit("60/minute")
def fighter_other_organizations(request: Request, response: Response, name: str) -> list[OtherOrganization]:
    """The same person's fights in the PFL and Bellator, when they have fought there (empty otherwise)."""
    try:
        profile = get_fighter_profile(name)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    response.headers["Cache-Control"] = "public, max-age=300"
    return [OtherOrganization(**found) for found in other_organizations(profile["name"])]


@router.get("/fighters/{name}/model-record", response_model=ModelRecordResponse)
@limiter.limit("60/minute")
def fighter_model_record(request: Request, response: Response, name: str) -> ModelRecordResponse:
    """How the model has done on this fighter's fights, in the back-test and live."""
    try:
        name = get_fighter_profile(name)["name"]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    response.headers["Cache-Control"] = "public, max-age=600"
    return ModelRecordResponse(**get_model_record(name))


@router.get("/track-record/surprises", response_model=SurprisesResponse)
@limiter.limit("60/minute")
def track_record_surprises(request: Request, response: Response) -> SurprisesResponse:
    response.headers["Cache-Control"] = "public, max-age=600"
    return SurprisesResponse(**get_surprises())
