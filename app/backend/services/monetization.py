import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from models.billing import BillingPayment, BillingSubscription
from models.listings import Listings
from models.monetization import ListingPromotion
from models.profiles import BusinessProfile, UserProfile
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession


logger = logging.getLogger(__name__)


PROFILE_PRIVATE = "private"
PROFILE_BUSINESS = "business"

LISTING_PRICING_FREE = "free"
LISTING_PRICING_BASIC = "basic"
LISTING_PRICING_BUSINESS = "business"

LISTING_VISIBILITY_STANDARD = "standard"
LISTING_VISIBILITY_BOOSTED = "boosted"
LISTING_VISIBILITY_FEATURED = "featured"

PROMOTION_BOOST = "boost"
PROMOTION_FEATURED = "featured"

PRIVATE_FREE_PRODUCT_CODE = "listing_free"
PRIVATE_BASIC_PRODUCT_CODE = "listing_basic"
PROMOTION_BOOST_PRODUCT_CODE = "promotion_boost"
PROMOTION_FEATURED_PRODUCT_CODE = "promotion_featured"
BUSINESS_STARTER_PRODUCT_CODE = "business_starter"
BUSINESS_GROWTH_PRODUCT_CODE = "business_growth"
BUSINESS_PRO_PRODUCT_CODE = "business_pro"

BUSINESS_PLAN_PRODUCT_MAP = {
    "starter": BUSINESS_STARTER_PRODUCT_CODE,
    "growth": BUSINESS_GROWTH_PRODUCT_CODE,
    "pro": BUSINESS_PRO_PRODUCT_CODE,
}

PROMOTION_PRODUCT_MAP = {
    PROMOTION_BOOST: PROMOTION_BOOST_PRODUCT_CODE,
    PROMOTION_FEATURED: PROMOTION_FEATURED_PRODUCT_CODE,
}

PRODUCT_CATALOG: dict[str, dict[str, Any]] = {
    PRIVATE_BASIC_PRODUCT_CODE: {
        "title": "Basic listing",
        "description": "Get more responses for 7 days.",
        "category": "listing_purchase",
        "target_type": "listing",
        "amount": Decimal("1.99"),
        "currency": "eur",
        "duration_days": 7,
        "pricing_tier": LISTING_PRICING_BASIC,
        "visibility": LISTING_VISIBILITY_STANDARD,
        "checkout_mode": "payment",
    },
    PROMOTION_BOOST_PRODUCT_CODE: {
        "title": "Boost",
        "description": "Your listing appears first for 3 days.",
        "category": "listing_promotion",
        "target_type": "listing",
        "amount": Decimal("2.99"),
        "currency": "eur",
        "duration_days": 3,
        "promotion_type": PROMOTION_BOOST,
        "checkout_mode": "payment",
    },
    PROMOTION_FEATURED_PRODUCT_CODE: {
        "title": "Featured",
        "description": "Show at the top for 7 days.",
        "category": "listing_promotion",
        "target_type": "listing",
        "amount": Decimal("6.99"),
        "currency": "eur",
        "duration_days": 7,
        "promotion_type": PROMOTION_FEATURED,
        "checkout_mode": "payment",
    },
    BUSINESS_STARTER_PRODUCT_CODE: {
        "title": "Starter",
        "description": "Publish up to 5 listings.",
        "category": "business_subscription",
        "target_type": "business_profile",
        "amount": Decimal("9.00"),
        "currency": "eur",
        "duration_days": 30,
        "plan_code": "starter",
        "listing_quota": 5,
        "priority_rank": 100,
        "is_premium": False,
        "checkout_mode": "payment",
    },
    BUSINESS_GROWTH_PRODUCT_CODE: {
        "title": "Growth",
        "description": "Get more responses with priority placement.",
        "category": "business_subscription",
        "target_type": "business_profile",
        "amount": Decimal("24.00"),
        "currency": "eur",
        "duration_days": 30,
        "plan_code": "growth",
        "listing_quota": 20,
        "priority_rank": 200,
        "is_premium": True,
        "checkout_mode": "payment",
    },
    BUSINESS_PRO_PRODUCT_CODE: {
        "title": "Pro",
        "description": "Show at the top with unlimited publishing.",
        "category": "business_subscription",
        "target_type": "business_profile",
        "amount": Decimal("49.00"),
        "currency": "eur",
        "duration_days": 30,
        "plan_code": "pro",
        "listing_quota": None,
        "priority_rank": 300,
        "is_premium": True,
        "checkout_mode": "payment",
    },
}


@dataclass
class ListingCreationDecision:
    pricing_tier: str
    visibility: str
    expires_at: datetime | None
    ranking_score: int
    required_product_code: str | None = None
    paywall_reason: str | None = None
    subscription_id: int | None = None


class PaymentRequiredError(ValueError):
    def __init__(self, message: str, product_code: str, paywall_reason: str, listing_id: int | None = None):
        super().__init__(message)
        self.product_code = product_code
        self.paywall_reason = paywall_reason
        self.listing_id = listing_id


class MonetizationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _parse_badges(raw_value: str | None) -> list[str]:
        if not raw_value:
            return []
        try:
            parsed = json.loads(raw_value)
        except (TypeError, ValueError):
            return []
        return [str(item) for item in parsed if isinstance(item, str)] if isinstance(parsed, list) else []

    @staticmethod
    def _dump_badges(values: list[str]) -> str:
        return json.dumps(values, ensure_ascii=True)

    async def get_user_profile(self, user_id: str) -> UserProfile | None:
        result = await self.db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
        return result.scalar_one_or_none()

    async def get_profile_type(self, user_id: str) -> str:
        profile = await self.get_user_profile(user_id)
        return profile.account_type if profile else PROFILE_PRIVATE

    async def get_business_profile(self, owner_user_id: str, business_slug: str) -> BusinessProfile | None:
        result = await self.db.execute(
            select(BusinessProfile).where(
                BusinessProfile.owner_user_id == owner_user_id,
                BusinessProfile.slug == business_slug,
            )
        )
        return result.scalar_one_or_none()

    async def get_active_subscription(self, business_id: int) -> BillingSubscription | None:
        now = self._now()
        result = await self.db.execute(
            select(BillingSubscription).where(
                BillingSubscription.business_profile_id == business_id,
                BillingSubscription.status == "active",
                or_(BillingSubscription.current_period_end.is_(None), BillingSubscription.current_period_end > now),
            )
            .order_by(BillingSubscription.current_period_end.desc().nullslast(), BillingSubscription.id.desc())
        )
        return result.scalars().first()

    async def _has_free_listing_history(self, user_id: str) -> bool:
        count = await self.db.scalar(
            select(func.count(Listings.id)).where(
                Listings.user_id == user_id,
                Listings.pricing_tier == LISTING_PRICING_FREE,
            )
        )
        return bool(count)

    async def _active_business_listing_count(self, business_slug: str) -> int:
        count = await self.db.scalar(
            select(func.count(Listings.id)).where(
                Listings.owner_type == "business_profile",
                Listings.owner_id == business_slug,
                Listings.status.in_(["draft", "moderation_pending", "published", "active"]),
            )
        )
        return int(count or 0)

    async def has_paid_listing_access(self, listing_id: int) -> bool:
        now = self._now()
        count = await self.db.scalar(
            select(func.count(BillingPayment.id)).where(
                BillingPayment.listing_id == listing_id,
                BillingPayment.product_code == PRIVATE_BASIC_PRODUCT_CODE,
                BillingPayment.status == "paid",
                or_(BillingPayment.period_end.is_(None), BillingPayment.period_end > now),
            )
        )
        return bool(count)

    async def _is_first_free_listing(self, user_id: str, listing_id: int) -> bool:
        result = await self.db.execute(
            select(Listings.id)
            .where(
                Listings.user_id == user_id,
                Listings.pricing_tier == LISTING_PRICING_FREE,
            )
            .order_by(Listings.created_at.asc(), Listings.id.asc())
            .limit(1)
        )
        first_listing_id = result.scalar_one_or_none()
        return first_listing_id == listing_id

    async def resolve_listing_creation(
        self,
        user_id: str,
        owner_type: str,
        owner_id: str,
        requested_pricing_tier: str | None,
    ) -> ListingCreationDecision:
        now = self._now()
        profile_type = await self.get_profile_type(user_id)

        if profile_type == PROFILE_BUSINESS or owner_type == "business_profile":
            business = await self.get_business_profile(user_id, owner_id)
            if not business:
                raise PaymentRequiredError(
                    "Activate a business plan to publish.",
                    BUSINESS_GROWTH_PRODUCT_CODE,
                    "business_without_subscription",
                )
            subscription = await self.get_active_subscription(business.id)
            if not subscription:
                raise PaymentRequiredError(
                    "Activate a business plan to publish.",
                    BUSINESS_GROWTH_PRODUCT_CODE,
                    "business_without_subscription",
                )

            product = PRODUCT_CATALOG[BUSINESS_PLAN_PRODUCT_MAP.get(subscription.plan_code, BUSINESS_GROWTH_PRODUCT_CODE)]
            limit = product.get("listing_quota")
            active_count = await self._active_business_listing_count(business.slug)
            if limit is not None and active_count >= int(limit):
                raise ValueError("Listing limit reached for the current business plan")

            return ListingCreationDecision(
                pricing_tier=LISTING_PRICING_BUSINESS,
                visibility=LISTING_VISIBILITY_STANDARD,
                expires_at=subscription.current_period_end,
                ranking_score=int(product.get("priority_rank") or 0),
                subscription_id=subscription.id,
            )

        desired_tier = requested_pricing_tier or LISTING_PRICING_FREE
        if desired_tier == LISTING_PRICING_FREE:
            if await self._has_free_listing_history(user_id):
                raise PaymentRequiredError(
                    "Choose Basic to keep publishing.",
                    PRIVATE_BASIC_PRODUCT_CODE,
                    "free_listing_already_used",
                )
            return ListingCreationDecision(
                pricing_tier=LISTING_PRICING_FREE,
                visibility=LISTING_VISIBILITY_STANDARD,
                expires_at=now + timedelta(days=3),
                ranking_score=0,
            )

        return ListingCreationDecision(
            pricing_tier=LISTING_PRICING_BASIC,
            visibility=LISTING_VISIBILITY_STANDARD,
            expires_at=now + timedelta(days=7),
            ranking_score=0,
            required_product_code=PRIVATE_BASIC_PRODUCT_CODE,
            paywall_reason="private_paid_required",
        )

    async def assert_listing_submission_allowed(self, listing: Listings) -> None:
        if listing.pricing_tier == LISTING_PRICING_FREE:
            if not await self._is_first_free_listing(listing.user_id, listing.id):
                raise PaymentRequiredError(
                    "Choose Basic to keep publishing.",
                    PRIVATE_BASIC_PRODUCT_CODE,
                    "free_listing_already_used",
                    listing_id=listing.id,
                )
            return
        if listing.pricing_tier == LISTING_PRICING_BASIC:
            if not await self.has_paid_listing_access(listing.id):
                raise PaymentRequiredError(
                    "Complete payment to publish this listing.",
                    PRIVATE_BASIC_PRODUCT_CODE,
                    "payment_required_for_basic_listing",
                    listing_id=listing.id,
                )
            return
        if listing.pricing_tier == LISTING_PRICING_BUSINESS:
            business = await self.get_business_profile(listing.user_id, listing.owner_id)
            if not business:
                raise PaymentRequiredError(
                    "Activate a business plan to publish.",
                    BUSINESS_GROWTH_PRODUCT_CODE,
                    "business_without_subscription",
                    listing_id=listing.id,
                )
            subscription = await self.get_active_subscription(business.id)
            if not subscription:
                raise PaymentRequiredError(
                    "Activate a business plan to publish.",
                    BUSINESS_GROWTH_PRODUCT_CODE,
                    "business_without_subscription",
                    listing_id=listing.id,
                )
            product = PRODUCT_CATALOG[BUSINESS_PLAN_PRODUCT_MAP.get(subscription.plan_code, BUSINESS_GROWTH_PRODUCT_CODE)]
            limit = product.get("listing_quota")
            active_count = await self._active_business_listing_count(business.slug)
            if limit is not None and active_count > int(limit):
                raise ValueError("Listing limit reached for the current business plan")

    async def recompute_listing_state(self, listing_id: int) -> Listings | None:
        listing = await self.db.get(Listings, listing_id)
        if not listing:
            return None

        now = self._now()
        promotions_result = await self.db.execute(
            select(ListingPromotion).where(
                ListingPromotion.listing_id == listing_id,
                ListingPromotion.status == "active",
                ListingPromotion.expires_at > now,
            )
        )
        promotions = promotions_result.scalars().all()
        has_featured = any(item.promotion_type == PROMOTION_FEATURED for item in promotions)
        has_boost = any(item.promotion_type == PROMOTION_BOOST for item in promotions)

        base_rank = 0
        badges = self._parse_badges(listing.badges)
        if listing.pricing_tier == LISTING_PRICING_BUSINESS and listing.owner_type == "business_profile":
            business = await self.get_business_profile(listing.user_id, listing.owner_id)
            if business:
                subscription = await self.get_active_subscription(business.id)
                if subscription:
                    product = PRODUCT_CATALOG[BUSINESS_PLAN_PRODUCT_MAP.get(subscription.plan_code, BUSINESS_GROWTH_PRODUCT_CODE)]
                    base_rank = int(product.get("priority_rank") or 0)
                    if subscription.plan_code == "pro" and "featured" not in badges:
                        badges.append("featured")
        else:
            badges = [badge for badge in badges if badge != "featured"]

        listing.badges = self._dump_badges(badges)

        if has_featured:
            listing.visibility = LISTING_VISIBILITY_FEATURED
            listing.is_featured = True
            listing.is_promoted = True
            listing.ranking_score = 3000 + base_rank
        elif has_boost:
            listing.visibility = LISTING_VISIBILITY_BOOSTED
            listing.is_featured = False
            listing.is_promoted = True
            listing.ranking_score = 2000 + base_rank
        else:
            listing.visibility = LISTING_VISIBILITY_STANDARD
            listing.is_featured = False
            listing.is_promoted = False
            listing.ranking_score = base_rank

        listing.updated_at = now
        await self.db.flush()
        return listing

    async def get_current_subscription_summary(self, user_id: str) -> dict[str, Any]:
        profile_type = await self.get_profile_type(user_id)
        if profile_type == PROFILE_PRIVATE:
            return {
                "profile_type": PROFILE_PRIVATE,
                "has_active_subscription": False,
                "plan": None,
                "status": None,
                "expires_at": None,
                "listing_quota": None,
                "active_listings_count": 0,
                "remaining_listing_quota": None,
                "paywall_reason": None,
            }

        businesses_result = await self.db.execute(
            select(BusinessProfile).where(BusinessProfile.owner_user_id == user_id).order_by(BusinessProfile.created_at.asc())
        )
        businesses = businesses_result.scalars().all()
        for business in businesses:
            subscription = await self.get_active_subscription(business.id)
            active_count = await self._active_business_listing_count(business.slug)
            if subscription:
                product = PRODUCT_CATALOG[BUSINESS_PLAN_PRODUCT_MAP.get(subscription.plan_code, BUSINESS_GROWTH_PRODUCT_CODE)]
                quota = product.get("listing_quota")
                return {
                    "profile_type": PROFILE_BUSINESS,
                    "has_active_subscription": True,
                    "plan": subscription.plan_code,
                    "status": subscription.status,
                    "expires_at": subscription.current_period_end,
                    "listing_quota": quota,
                    "active_listings_count": active_count,
                    "remaining_listing_quota": None if quota is None else max(int(quota) - active_count, 0),
                    "paywall_reason": None,
                }

        return {
            "profile_type": PROFILE_BUSINESS,
            "has_active_subscription": False,
            "plan": None,
            "status": "inactive",
            "expires_at": None,
            "listing_quota": None,
            "active_listings_count": 0,
            "remaining_listing_quota": None,
            "paywall_reason": "business_without_subscription",
        }

    async def expire_due_entities(self, *, as_of: datetime | None = None) -> dict[str, Any]:
        now = as_of or self._now()
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        else:
            now = now.astimezone(timezone.utc)

        expired_listings_result = await self.db.execute(
            select(Listings).where(
                Listings.expiry_date.is_not(None),
                Listings.expiry_date <= now,
                Listings.status.in_(["published", "active", "moderation_pending"]),
            )
        )
        expired_listings = expired_listings_result.scalars().all()
        expired_listing_ids = sorted(listing.id for listing in expired_listings)
        for listing in expired_listings:
            listing.status = "expired"
            listing.updated_at = now

        expired_promotions_result = await self.db.execute(
            select(ListingPromotion).where(
                ListingPromotion.status == "active",
                ListingPromotion.expires_at <= now,
            )
        )
        expired_promotions = expired_promotions_result.scalars().all()
        expired_promotion_ids = sorted(promotion.id for promotion in expired_promotions)
        affected_listing_ids = set()
        for promotion in expired_promotions:
            promotion.status = "expired"
            promotion.updated_at = now
            affected_listing_ids.add(promotion.listing_id)

        expired_subscriptions_result = await self.db.execute(
            select(BillingSubscription).where(
                BillingSubscription.status == "active",
                BillingSubscription.current_period_end.is_not(None),
                BillingSubscription.current_period_end <= now,
            )
        )
        expired_subscriptions = expired_subscriptions_result.scalars().all()
        expired_subscription_ids = sorted(subscription.id for subscription in expired_subscriptions)
        affected_business_profile_ids = set()
        for subscription in expired_subscriptions:
            subscription.status = "expired"
            affected_business_profile_ids.add(subscription.business_profile_id)
            await self.db.execute(
                update(BusinessProfile)
                .where(BusinessProfile.id == subscription.business_profile_id)
                .values(
                    subscription_plan=None,
                    subscription_renewal_date=None,
                    listing_quota=None,
                    is_premium=False,
                )
            )
            listings_result = await self.db.execute(
                select(Listings.id).where(
                    Listings.owner_type == "business_profile",
                    Listings.owner_id == select(BusinessProfile.slug).where(BusinessProfile.id == subscription.business_profile_id).scalar_subquery(),
                )
            )
            affected_listing_ids.update(listings_result.scalars().all())

        for listing_id in affected_listing_ids:
            await self.recompute_listing_state(int(listing_id))

        await self.db.commit()
        summary = {
            "as_of": now.isoformat(),
            "expired_listings": len(expired_listing_ids),
            "expired_listing_ids": expired_listing_ids,
            "expired_promotions": len(expired_promotion_ids),
            "expired_promotion_ids": expired_promotion_ids,
            "expired_subscriptions": len(expired_subscription_ids),
            "expired_subscription_ids": expired_subscription_ids,
            "affected_listing_ids": sorted(int(listing_id) for listing_id in affected_listing_ids),
            "affected_business_profile_ids": sorted(
                int(business_profile_id) for business_profile_id in affected_business_profile_ids
            ),
        }
        logger.info(
            "Expiration run finished as_of=%s expired_listing_ids=%s expired_promotion_ids=%s expired_subscription_ids=%s affected_listing_ids=%s affected_business_profile_ids=%s",
            summary["as_of"],
            summary["expired_listing_ids"],
            summary["expired_promotion_ids"],
            summary["expired_subscription_ids"],
            summary["affected_listing_ids"],
            summary["affected_business_profile_ids"],
        )
        return summary
