from fastapi import APIRouter, HTTPException, Query, Request, Response

from backend.app.rate_limit import limiter
from backend.app.schemas.fighters import FighterSummary
from backend.app.schemas.similarity import SimilarFighter
from backend.app.services.catalog_service import get_fighter_profile, list_fighters
from backend.app.services.elo_service import get_fighter_elo
from backend.app.services.similarity_service import get_similar_fighters
from backend.app.utils.columns import columns_response, to_columns

router = APIRouter(tags=["fighters"])


# What the site's list does not use: it is the heaviest answer of the API and every page asks for it.
LIST_LEAVES_OUT = {"roster_url", "elo", "peak_elo", "elo_rank"}


@router.get("/fighters", response_model=None)
@limiter.limit("60/minute")
def fighters(
    request: Request,
    response: Response,
    limit: int | None = Query(default=None, ge=1, le=5000, description="Max number of fighters to return."),
    offset: int = Query(default=0, ge=0, description="Number of fighters to skip."),
    ufc_only: bool = Query(default=False, description="Leave out fighters who never fought in the UFC."),
    columns: bool = Query(default=False, description="Answer one column per field instead of one object per fighter (smaller)."),
) -> list[FighterSummary] | Response:
    catalog = list_fighters(ufc_only=ufc_only)
    headers = {"Cache-Control": "public, max-age=300", "X-Total-Count": str(len(catalog))}
    response.headers.update(headers)
    page = catalog[offset : offset + limit] if limit is not None else catalog[offset:]
    summaries = [FighterSummary(**fighter) for fighter in page]
    if columns:
        return columns_response(to_columns([summary.model_dump() for summary in summaries], LIST_LEAVES_OUT), headers)
    return summaries


@router.get("/fighters/{name}/similar", response_model=list[SimilarFighter])
@limiter.limit("60/minute")
def similar_fighters(
    request: Request,
    response: Response,
    name: str,
    limit: int = Query(default=5, ge=1, le=20, description="Max number of similar fighters to return."),
) -> list[SimilarFighter]:
    try:
        name = get_fighter_profile(name)["name"]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    response.headers["Cache-Control"] = "public, max-age=300"
    return [SimilarFighter(**fighter) for fighter in get_similar_fighters(name, limit=limit)]


@router.get("/fighters/{name}/elo")
@limiter.limit("60/minute")
def fighter_elo(
    request: Request,
    response: Response,
    name: str,
) -> dict:
    try:
        name = get_fighter_profile(name)["name"]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    response.headers["Cache-Control"] = "public, max-age=300"
    return get_fighter_elo(name)
