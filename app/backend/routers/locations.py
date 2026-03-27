import logging

from fastapi import APIRouter, HTTPException, Query

from schemas.locations import CitySuggestionResponse
from services.location_service import LocationSearchService

router = APIRouter(prefix="/api/v1/locations", tags=["locations"])
logger = logging.getLogger(__name__)


@router.get("/cities/search", response_model=list[CitySuggestionResponse])
async def search_cities(
    q: str = Query(..., min_length=2, max_length=120),
    limit: int = Query(8, ge=1, le=12),
    country_code: str | None = Query(None, min_length=2, max_length=8),
    language: str | None = Query(None, min_length=2, max_length=64),
):
    service = LocationSearchService()

    try:
        return await service.search_cities(
            query=q,
            limit=limit,
            country_code=country_code,
            language=language,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Location lookup failed for query '%s': %s", q, exc)
        raise HTTPException(status_code=502, detail="Location search is temporarily unavailable") from exc