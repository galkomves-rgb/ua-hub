from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies.auth import get_current_user_id
from dependencies.database import get_db_session
from schemas.saved import (
    SavedBusinessCardResponse,
    SavedBusinessResponse,
    SavedListingCardResponse,
    SavedListingResponse,
    SearchAlertCreate,
    SearchAlertResponse,
    SearchHistoryCreate,
    SearchHistoryResponse,
    SearchAlertUpdate,
)
from services.saved_service import SavedService, SavedTargetNotFoundError
from services.search_histories import Search_historiesService

router = APIRouter(prefix="/api/v1/saved", tags=["saved"])


@router.get("/listings", response_model=list[SavedListingCardResponse])
async def list_saved_listings(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = SavedService(db)
    return await service.list_saved_listings(user_id)


@router.post("/listings/{listing_id}", response_model=SavedListingResponse, status_code=status.HTTP_201_CREATED)
async def save_listing(
    listing_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = SavedService(db)
    try:
        return await service.save_listing(user_id, listing_id)
    except SavedTargetNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/listings/{listing_id}")
async def remove_saved_listing(
    listing_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = SavedService(db)
    deleted = await service.remove_saved_listing(user_id, listing_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Saved listing not found")
    return {"message": "Saved listing removed successfully"}


@router.get("/businesses", response_model=list[SavedBusinessCardResponse])
async def list_saved_businesses(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = SavedService(db)
    return await service.list_saved_businesses(user_id)


@router.post("/businesses/{business_id}", response_model=SavedBusinessResponse, status_code=status.HTTP_201_CREATED)
async def save_business(
    business_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = SavedService(db)
    try:
        return await service.save_business(user_id, business_id)
    except SavedTargetNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/businesses/{business_id}")
async def remove_saved_business(
    business_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = SavedService(db)
    deleted = await service.remove_saved_business(user_id, business_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Saved business not found")
    return {"message": "Saved business removed successfully"}


@router.get("/search-alerts", response_model=list[SearchAlertResponse])
async def list_search_alerts(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = SavedService(db)
    return await service.list_search_alerts(user_id)


@router.post("/search-alerts", response_model=SearchAlertResponse, status_code=status.HTTP_201_CREATED)
async def create_search_alert(
    payload: SearchAlertCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = SavedService(db)
    return await service.create_search_alert(
        user_id=user_id,
        query=payload.query,
        module=payload.module,
        city=payload.city,
        filters_json=payload.filters_json,
        email_alerts_enabled=payload.email_alerts_enabled,
    )


@router.put("/search-alerts/{alert_id}", response_model=SearchAlertResponse)
async def update_search_alert(
    alert_id: int,
    payload: SearchAlertUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = SavedService(db)
    alert = await service.update_search_alert(
        user_id=user_id,
        alert_id=alert_id,
        query=payload.query,
        module=payload.module,
        city=payload.city,
        filters_json=payload.filters_json,
        email_alerts_enabled=payload.email_alerts_enabled,
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Search alert not found")
    return alert


@router.delete("/search-alerts/{alert_id}")
async def delete_search_alert(
    alert_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = SavedService(db)
    deleted = await service.delete_search_alert(user_id, alert_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Search alert not found")
    return {"message": "Search alert removed successfully"}


@router.get("/search-history", response_model=list[SearchHistoryResponse])
async def list_search_history(
    limit: int = Query(8, ge=1, le=50),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = Search_historiesService(db)
    return await service.list_recent(user_id=user_id, limit=limit)


@router.post("/search-history", response_model=SearchHistoryResponse, status_code=status.HTTP_201_CREATED)
async def create_search_history_entry(
    payload: SearchHistoryCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = Search_historiesService(db)
    try:
        return await service.create_or_replace_recent(user_id=user_id, query=payload.query)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/search-history/{history_id}")
async def delete_search_history_entry(
    history_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = Search_historiesService(db)
    deleted = await service.delete(history_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Search history entry not found")
    return {"message": "Search history entry removed successfully"}


@router.delete("/search-history")
async def clear_search_history(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = Search_historiesService(db)
    deleted_count = await service.clear_user_history(user_id=user_id)
    return {"deleted_count": deleted_count}
