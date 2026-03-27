from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies.auth import get_admin_user
from dependencies.database import get_db_session
from schemas.admin import AdminOverviewResponse
from schemas.auth import UserResponse
from services.admin_service import AdminService


router = APIRouter(prefix="/api/v1/admin", tags=["admin-overview"])


@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    _admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    return await AdminService(db).get_overview()