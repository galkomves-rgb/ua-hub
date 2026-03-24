from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies.auth import get_current_user_id
from dependencies.database import get_db_session
from schemas.account import AccountDashboardResponse
from services.account_service import AccountService

router = APIRouter(prefix="/api/v1/account", tags=["account"])


@router.get("/dashboard", response_model=AccountDashboardResponse)
async def get_account_dashboard(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Return dashboard counters for the current account cabinet."""
    service = AccountService(db)
    return await service.get_dashboard(user_id)
