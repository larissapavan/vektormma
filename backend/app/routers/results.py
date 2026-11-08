from fastapi import APIRouter, Query, Request, Response

from backend.app.rate_limit import limiter
from backend.app.schemas.results import RecentResultsResponse
from backend.app.services.results_service import get_recent_results

router = APIRouter(tags=["results"])


@router.get("/results/recent", response_model=RecentResultsResponse)
@limiter.limit("60/minute")
def recent_results(request: Request, response: Response, days: int = Query(default=7, ge=1, le=31)) -> RecentResultsResponse:
    """Every event of the last `days` days that has results, from every organisation, with the model's pick for each fight it logged."""
    response.headers["Cache-Control"] = "public, max-age=300"
    return RecentResultsResponse(**get_recent_results(days))
