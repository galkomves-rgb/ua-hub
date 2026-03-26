import logging

from dependencies.auth import get_admin_user, get_current_user, get_current_user_id
from dependencies.database import get_db_session
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from schemas.auth import UserResponse
from schemas.billing import (
    BillingAdminOverrideRequest,
    BillingCheckoutRequest,
    BillingCheckoutResponse,
    BillingHistoryItemResponse,
    BillingOverviewResponse,
    BillingVerifyRequest,
    BillingVerifyResponse,
)
from services.billing import BillingService
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])
admin_router = APIRouter(prefix="/api/v1/admin/billing", tags=["admin-billing"])


@router.get("/overview", response_model=BillingOverviewResponse)
async def get_billing_overview(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = BillingService(db)
    return await service.get_overview(user_id)


@router.get("/history", response_model=list[BillingHistoryItemResponse])
async def get_billing_history(
    limit: int = Query(100, ge=1, le=500),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = BillingService(db)
    return await service.list_history(user_id, limit=limit)


@router.post("/checkout", response_model=BillingCheckoutResponse, status_code=status.HTTP_201_CREATED)
async def create_billing_checkout(
    payload: BillingCheckoutRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = BillingService(db)
    try:
        return await service.create_checkout_session(
            user_id=user_id,
            product_code=payload.product_code,
            business_slug=payload.business_slug,
            listing_id=payload.listing_id,
            success_url=payload.success_url,
            cancel_url=payload.cancel_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Billing checkout failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create checkout session") from exc


@router.post("/verify", response_model=BillingVerifyResponse)
async def verify_billing_checkout(
    payload: BillingVerifyRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = BillingService(db)
    try:
        payment = await service.verify_checkout_session(str(current_user.id), payload.session_id)
        return {"payment": payment}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Billing verification failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to verify checkout session") from exc


@router.post("/webhook")
async def process_billing_webhook(
    request: Request,
    stripe_signature: str | None = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db_session),
):
    service = BillingService(db)
    try:
        await service.process_webhook(await request.body(), stripe_signature)
        return {"received": True}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Billing webhook failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process billing webhook") from exc


@admin_router.post("/payments/{payment_id}/override", response_model=BillingHistoryItemResponse)
async def admin_override_billing_payment(
    payment_id: int,
    payload: BillingAdminOverrideRequest,
    admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = BillingService(db)
    try:
        return await service.admin_override_payment(
            payment_id=payment_id,
            admin_user_id=str(admin_user.id),
            payment_status=payload.payment_status,
            entitlement_status=payload.entitlement_status,
            note=payload.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Billing admin override failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to override billing payment") from exc