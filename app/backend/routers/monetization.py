from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies.auth import get_admin_user, get_current_user_id
from dependencies.database import get_db_session
from schemas.monetization import (
    ExpirationRunResponse,
    ListingCreateResultResponse,
    ListingCreateWithPricingRequest,
    ListingExtendRequest,
    PaymentConfirmRequest,
    PaymentConfirmResponse,
    PaymentCreateRequest,
    PaymentCreateResponse,
    PromotionCheckoutResponse,
    SubscriptionActivateRequest,
    SubscriptionCurrentResponse,
)
from schemas.listings import ListingSummaryResponse
from services.billing import BillingService
from services.listings_service import ListingsService
from services.monetization import (
    BUSINESS_PLAN_PRODUCT_MAP,
    MonetizationService,
    PROMOTION_PRODUCT_MAP,
    PaymentRequiredError,
    PRIVATE_BASIC_PRODUCT_CODE,
)
from schemas.auth import UserResponse

router = APIRouter(prefix="/api/v1", tags=["monetization"])
admin_router = APIRouter(prefix="/api/v1/admin/monetization", tags=["admin-monetization"])


@router.post("/listings/create", response_model=ListingCreateResultResponse, status_code=status.HTTP_201_CREATED)
async def create_listing_with_monetization(
    payload: ListingCreateWithPricingRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    monetization = MonetizationService(db)
    listings = ListingsService(db)

    try:
        decision = await monetization.resolve_listing_creation(
            user_id=user_id,
            owner_type=payload.owner_type,
            owner_id=payload.owner_id,
            requested_pricing_tier=payload.pricing_tier,
        )
        listing = await listings.create_listing(
            user_id=user_id,
            module=payload.module,
            category=payload.category,
            subcategory=payload.subcategory,
            title=payload.title,
            description=payload.description,
            price=payload.price,
            currency=payload.currency,
            city=payload.city,
            region=payload.region,
            owner_type=payload.owner_type,
            owner_id=payload.owner_id,
            pricing_tier=decision.pricing_tier,
            visibility=decision.visibility,
            ranking_score=decision.ranking_score,
            expiry_date=decision.expires_at,
            images_json=payload.images_json,
            meta_json=payload.meta_json,
        )
        return {
            "listing": listing,
            "payment_required": False,
            "required_product_code": None,
            "message": None,
        }
    except PaymentRequiredError as exc:
        listing = await listings.create_listing(
            user_id=user_id,
            module=payload.module,
            category=payload.category,
            subcategory=payload.subcategory,
            title=payload.title,
            description=payload.description,
            price=payload.price,
            currency=payload.currency,
            city=payload.city,
            region=payload.region,
            owner_type=payload.owner_type,
            owner_id=payload.owner_id,
            pricing_tier="basic" if exc.product_code == PRIVATE_BASIC_PRODUCT_CODE else "business",
            visibility="standard",
            ranking_score=0,
            expiry_date=None,
            images_json=payload.images_json,
            meta_json=payload.meta_json,
        )
        raise HTTPException(
            status_code=402,
            detail={
                "message": str(exc),
                "required_product_code": exc.product_code,
                "paywall_reason": exc.paywall_reason,
                "listing_id": listing.id,
            },
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/listings/extend", response_model=PaymentCreateResponse)
async def extend_listing(
    payload: ListingExtendRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    listings = ListingsService(db)
    billing = BillingService(db)
    listing = await listings.get_listing(payload.listing_id)
    if not listing or listing.user_id != user_id:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.pricing_tier != "basic":
        raise HTTPException(status_code=400, detail="Only Basic listings can be extended")
    checkout = await billing.create_checkout_session(user_id=user_id, product_code=PRIVATE_BASIC_PRODUCT_CODE, listing_id=listing.id)
    return {**checkout, "type": PRIVATE_BASIC_PRODUCT_CODE}


@router.get("/listings/my", response_model=list[ListingSummaryResponse])
async def get_my_monetized_listings(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = ListingsService(db)
    return await service.list_user_listings(user_id=user_id)


@router.post("/promotions/boost", response_model=PromotionCheckoutResponse)
async def create_boost_checkout(
    payload: ListingExtendRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    billing = BillingService(db)
    checkout = await billing.create_checkout_session(user_id=user_id, product_code=PROMOTION_PRODUCT_MAP["boost"], listing_id=payload.listing_id)
    return {**checkout, "listing_id": payload.listing_id, "promotion_type": "boost"}


@router.post("/promotions/featured", response_model=PromotionCheckoutResponse)
async def create_featured_checkout(
    payload: ListingExtendRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    billing = BillingService(db)
    checkout = await billing.create_checkout_session(user_id=user_id, product_code=PROMOTION_PRODUCT_MAP["featured"], listing_id=payload.listing_id)
    return {**checkout, "listing_id": payload.listing_id, "promotion_type": "featured"}


@router.post("/subscriptions/activate", response_model=PaymentCreateResponse)
async def activate_subscription(
    payload: SubscriptionActivateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    billing = BillingService(db)
    checkout = await billing.create_checkout_session(
        user_id=user_id,
        product_code=BUSINESS_PLAN_PRODUCT_MAP[payload.plan],
        business_slug=payload.business_slug,
    )
    return {**checkout, "type": BUSINESS_PLAN_PRODUCT_MAP[payload.plan]}


@router.get("/subscriptions/current", response_model=SubscriptionCurrentResponse)
async def get_current_subscription(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    service = MonetizationService(db)
    return await service.get_current_subscription_summary(user_id)


@router.post("/payments/create", response_model=PaymentCreateResponse)
async def create_payment(
    payload: PaymentCreateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    billing = BillingService(db)
    checkout = await billing.create_checkout_session(
        user_id=user_id,
        product_code=payload.type,
        business_slug=payload.business_slug,
        listing_id=payload.listing_id,
        success_url=payload.success_url,
        cancel_url=payload.cancel_url,
    )
    return {**checkout, "type": payload.type}


@router.post("/payments/confirm", response_model=PaymentConfirmResponse)
async def confirm_payment(
    payload: PaymentConfirmRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    billing = BillingService(db)
    payment = await billing.verify_checkout_session(user_id, payload.session_id)
    return {"payment": payment}


@admin_router.post("/run-expirations", response_model=ExpirationRunResponse)
async def run_expiration_jobs(
    as_of: datetime | None = Query(None, description="Optional UTC timestamp used to simulate expiration processing"),
    _admin_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = MonetizationService(db)
    return await service.expire_due_entities(as_of=as_of)
