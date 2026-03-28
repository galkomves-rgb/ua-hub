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
PRIVATE_EXTENSION_PRODUCT_CODE = "listing_extend_30"
PRIVATE_NEXT_PRODUCT_CODE = "next_private_listing_30"
PROMOTION_BOOST_PRODUCT_CODE = "boost"
PROMOTION_FEATURED_PRODUCT_CODE = "featured"
BUSINESS_STARTER_PRODUCT_CODE = "business_presence"
BUSINESS_GROWTH_PRODUCT_CODE = "business_priority"
BUSINESS_PRO_PRODUCT_CODE = "agency_starter"
AGENCY_GROWTH_PRODUCT_CODE = "agency_growth"
AGENCY_PRO_PRODUCT_CODE = "agency_pro"

LEGACY_PRODUCT_CODE_ALIASES = {
    "listing_basic": PRIVATE_NEXT_PRODUCT_CODE,
    "promotion_boost": PROMOTION_BOOST_PRODUCT_CODE,
    "promotion_featured": PROMOTION_FEATURED_PRODUCT_CODE,
    "business_starter": BUSINESS_STARTER_PRODUCT_CODE,
    "business_growth": BUSINESS_GROWTH_PRODUCT_CODE,
    "business_pro": BUSINESS_PRO_PRODUCT_CODE,
}

LISTING_POLICY_ALWAYS_FREE = "always_free"
LISTING_POLICY_PRIVATE_TRIAL = "private_trial"
LISTING_POLICY_PRIVATE_PAID = "private_paid"
LISTING_POLICY_BUSINESS = "business"
SUBSCRIPTION_ACTIVE_STATUSES = {"active", "trialing"}

ALWAYS_FREE_MODULES = {"community", "organizations"}
ALWAYS_FREE_MODULE_CATEGORY_RULES = {
    "jobs": {"job-seekers"},
    "housing": {"looking", "room-search", "room-searching"},
    "events": {"community-meetups", "community-events", "volunteering", "cultural"},
}
ALWAYS_FREE_CATEGORIES = {
    "job-seekers",
    "looking",
    "room-search",
    "volunteering",
    "non-profit",
    "nonprofit",
    "community-posts",
    "community-events",
    "community-meetups",
    "community-initiatives",
    "cultural",
}

BUSINESS_PLAN_PRODUCT_MAP = {
    "starter": BUSINESS_STARTER_PRODUCT_CODE,
    "growth": BUSINESS_GROWTH_PRODUCT_CODE,
    "pro": BUSINESS_PRO_PRODUCT_CODE,
    "business_presence": BUSINESS_STARTER_PRODUCT_CODE,
    "business_priority": BUSINESS_GROWTH_PRODUCT_CODE,
    "agency_starter": BUSINESS_PRO_PRODUCT_CODE,
    "agency_growth": AGENCY_GROWTH_PRODUCT_CODE,
    "agency_pro": AGENCY_PRO_PRODUCT_CODE,
}

PROMOTION_PRODUCT_MAP = {
    PROMOTION_BOOST: PROMOTION_BOOST_PRODUCT_CODE,
    PROMOTION_FEATURED: PROMOTION_FEATURED_PRODUCT_CODE,
}

PRODUCT_CATALOG: dict[str, dict[str, Any]] = {
    PRIVATE_NEXT_PRODUCT_CODE: {
        "title": "Private listing 30 days",
        "description": "Keep a private paid listing active for 30 days.",
        "category": "listing_purchase",
        "target_type": "listing",
        "amount": Decimal("4.99"),
        "currency": "eur",
        "duration_days": 30,
        "pricing_tier": LISTING_PRICING_BASIC,
        "visibility": LISTING_VISIBILITY_STANDARD,
        "checkout_mode": "payment",
    },
    PRIVATE_EXTENSION_PRODUCT_CODE: {
        "title": "Complete 30 days",
        "description": "Extend the same first private paid listing to a full 30-day period.",
        "category": "listing_purchase",
        "target_type": "listing",
        "amount": Decimal("3.99"),
        "currency": "eur",
        "duration_days": 30,
        "pricing_tier": LISTING_PRICING_BASIC,
        "visibility": LISTING_VISIBILITY_STANDARD,
        "checkout_mode": "payment",
        "extension_total_days": 30,
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
        "amount": Decimal("5.99"),
        "currency": "eur",
        "duration_days": 7,
        "promotion_type": PROMOTION_FEATURED,
        "checkout_mode": "payment",
    },
    BUSINESS_STARTER_PRODUCT_CODE: {
        "title": "Business Presence",
        "description": "Commercial presence with one active offer and standard visibility.",
        "category": "business_subscription",
        "target_type": "business_profile",
        "amount": Decimal("9.99"),
        "currency": "eur",
        "duration_days": 30,
        "plan_code": "business_presence",
        "listing_quota": 1,
        "priority_rank": 100,
        "is_premium": False,
        "checkout_mode": "subscription",
        "trial_days": 14,
    },
    BUSINESS_GROWTH_PRODUCT_CODE: {
        "title": "Business Priority",
        "description": "Priority placement for one active commercial offer.",
        "category": "business_subscription",
        "target_type": "business_profile",
        "amount": Decimal("19.99"),
        "currency": "eur",
        "duration_days": 30,
        "plan_code": "business_priority",
        "listing_quota": 1,
        "priority_rank": 200,
        "is_premium": True,
        "checkout_mode": "subscription",
        "trial_days": 14,
    },
    BUSINESS_PRO_PRODUCT_CODE: {
        "title": "Agency Starter",
        "description": "Start with up to 10 active agency listings.",
        "category": "business_subscription",
        "target_type": "business_profile",
        "amount": Decimal("24.99"),
        "currency": "eur",
        "duration_days": 30,
        "plan_code": "agency_starter",
        "listing_quota": 10,
        "priority_rank": 220,
        "is_premium": True,
        "checkout_mode": "subscription",
        "trial_days": 14,
    },
    AGENCY_GROWTH_PRODUCT_CODE: {
        "title": "Agency Growth",
        "description": "Grow with up to 30 active listings and stronger visibility.",
        "category": "business_subscription",
        "target_type": "business_profile",
        "amount": Decimal("49.99"),
        "currency": "eur",
        "duration_days": 30,
        "plan_code": "agency_growth",
        "listing_quota": 30,
        "priority_rank": 280,
        "is_premium": True,
        "checkout_mode": "subscription",
        "trial_days": 14,
    },
    AGENCY_PRO_PRODUCT_CODE: {
        "title": "Agency Pro",
        "description": "Scale to 100 active listings with the strongest visibility.",
        "category": "business_subscription",
        "target_type": "business_profile",
        "amount": Decimal("79.99"),
        "currency": "eur",
        "duration_days": 30,
        "plan_code": "agency_pro",
        "listing_quota": 100,
        "priority_rank": 320,
        "is_premium": True,
        "checkout_mode": "subscription",
        "trial_days": 14,
    },
}


@dataclass
class ListingCreationDecision:
    pricing_tier: str
    visibility: str
    expires_at: datetime | None
    ranking_score: int
    pricing_policy: str
    metadata_patch: dict[str, Any] | None = None
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

    @staticmethod
    def normalize_product_code(product_code: str) -> str:
        return LEGACY_PRODUCT_CODE_ALIASES.get(product_code, product_code)

    @staticmethod
    def normalize_subscription_plan(plan_code: str) -> str:
        return BUSINESS_PLAN_PRODUCT_MAP.get(plan_code, plan_code)

    @staticmethod
    def _normalize_lookup_value(value: str | None) -> str:
        return (value or "").strip().lower().replace("_", "-")

    @classmethod
    def is_always_free_listing(cls, module: str, category: str) -> bool:
        normalized_module = cls._normalize_lookup_value(module)
        normalized_category = cls._normalize_lookup_value(category)
        if normalized_module in ALWAYS_FREE_MODULES:
            return True
        if normalized_category in ALWAYS_FREE_CATEGORIES:
            return True
        return normalized_category in ALWAYS_FREE_MODULE_CATEGORY_RULES.get(normalized_module, set())

    @staticmethod
    def _parse_metadata(raw_value: str | None) -> dict[str, Any]:
        if not raw_value:
            return {}
        try:
            parsed = json.loads(raw_value)
        except (TypeError, ValueError):
            return {}
        return parsed if isinstance(parsed, dict) else {}

    @staticmethod
    def merge_listing_metadata(raw_value: str | None, patch: dict[str, Any] | None) -> str:
        payload = MonetizationService._parse_metadata(raw_value)
        payload.update(patch or {})
        return json.dumps(payload, ensure_ascii=True)

    @classmethod
    def get_listing_pricing_policy(cls, listing: Listings) -> str:
        meta = cls._parse_metadata(listing.meta_json)
        value = meta.get("_pricing_policy")
        if isinstance(value, str) and value:
            return value
        return cls.infer_legacy_listing_pricing_policy(listing)

    @classmethod
    def build_listing_pricing_metadata(
        cls,
        *,
        policy: str,
        module: str,
        category: str,
        requires_email_verification: bool = False,
        requires_phone_verification: bool = False,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "_pricing_policy": policy,
            "_pricing_rules_version": "launch_v1",
            "_pricing_scope": {
                "module": module,
                "category": category,
            },
        }
        if policy == LISTING_POLICY_PRIVATE_TRIAL:
            payload["_verification_hooks"] = {
                "email_required": requires_email_verification,
                "phone_required": requires_phone_verification,
                # Phone verification storage does not exist yet; keep the hook explicit until it is wired.
                "phone_enforcement_ready": False,
            }
        return payload

    @classmethod
    def infer_legacy_listing_pricing_policy(cls, listing: Listings) -> str:
        if listing.pricing_tier == LISTING_PRICING_BUSINESS:
            return LISTING_POLICY_BUSINESS
        if listing.pricing_tier == LISTING_PRICING_BASIC:
            return LISTING_POLICY_PRIVATE_PAID
        if cls.is_always_free_listing(listing.module, listing.category):
            return LISTING_POLICY_ALWAYS_FREE
        if listing.status in {"published", "active", "moderation_pending"}:
            return LISTING_POLICY_PRIVATE_PAID
        return LISTING_POLICY_PRIVATE_TRIAL

    async def ensure_listing_pricing_metadata(self, listing: Listings) -> str:
        meta = self._parse_metadata(listing.meta_json)
        existing_policy = meta.get("_pricing_policy")
        if isinstance(existing_policy, str) and existing_policy:
            return existing_policy

        inferred_policy = self.infer_legacy_listing_pricing_policy(listing)
        patch = self.build_listing_pricing_metadata(
            policy=inferred_policy,
            module=listing.module,
            category=listing.category,
        )
        patch["_pricing_backfill"] = {
            "source": "lazy_legacy_fallback",
            "policy": inferred_policy,
        }
        listing.meta_json = self.merge_listing_metadata(listing.meta_json, patch)
        await self.db.flush()
        return inferred_policy

    async def evaluate_private_trial_verification_gate(self, user_id: str) -> dict[str, Any]:
        profile = await self.get_user_profile(user_id)
        email_verified = getattr(profile, "email_verified", None) if profile else None
        phone_verified = getattr(profile, "phone_verified", None) if profile else None
        email_enforcement_ready = email_verified is not None
        phone_enforcement_ready = phone_verified is not None
        if email_enforcement_ready and email_verified is False:
            return {
                "can_activate": False,
                "block_reason": "email_verification_required",
                "email_required": True,
                "email_verified": False,
                "email_enforcement_ready": True,
                "phone_required": True,
                "phone_verified": phone_verified,
                "phone_enforcement_ready": phone_enforcement_ready,
                "deferred_checks": [] if phone_enforcement_ready else ["phone_verification_not_persisted"],
            }
        if phone_enforcement_ready and phone_verified is False:
            return {
                "can_activate": False,
                "block_reason": "phone_verification_required",
                "email_required": True,
                "email_verified": email_verified,
                "email_enforcement_ready": email_enforcement_ready,
                "phone_required": True,
                "phone_verified": False,
                "phone_enforcement_ready": True,
                "deferred_checks": [] if email_enforcement_ready else ["email_verification_not_persisted"],
            }
        deferred_checks: list[str] = []
        if not email_enforcement_ready:
            deferred_checks.append("email_verification_not_persisted")
        if not phone_enforcement_ready:
            deferred_checks.append("phone_verification_not_persisted")
        return {
            "can_activate": True,
            "block_reason": None,
            "email_required": True,
            "email_verified": email_verified,
            "email_enforcement_ready": email_enforcement_ready,
            "phone_required": True,
            "phone_verified": phone_verified,
            "phone_enforcement_ready": phone_enforcement_ready,
            "deferred_checks": deferred_checks,
        }

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
                BillingSubscription.status.in_(list(SUBSCRIPTION_ACTIVE_STATUSES)),
                or_(BillingSubscription.current_period_end.is_(None), BillingSubscription.current_period_end > now),
            )
            .order_by(BillingSubscription.current_period_end.desc().nullslast(), BillingSubscription.id.desc())
        )
        return result.scalars().first()

    async def _has_private_trial_history(self, user_id: str) -> bool:
        result = await self.db.execute(
            select(Listings.meta_json).where(Listings.user_id == user_id)
        )
        for raw_meta in result.scalars().all():
            meta = self._parse_metadata(raw_meta)
            if meta.get("_pricing_policy") == LISTING_POLICY_PRIVATE_TRIAL:
                return True
        return False

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
                BillingPayment.product_code.in_(
                    [
                        PRIVATE_NEXT_PRODUCT_CODE,
                        PRIVATE_EXTENSION_PRODUCT_CODE,
                        "listing_basic",
                    ]
                ),
                BillingPayment.status == "paid",
                or_(BillingPayment.period_end.is_(None), BillingPayment.period_end > now),
            )
        )
        return bool(count)

    async def resolve_listing_creation(
        self,
        user_id: str,
        module: str,
        category: str,
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
                pricing_policy=LISTING_POLICY_BUSINESS,
                metadata_patch=self.build_listing_pricing_metadata(
                    policy=LISTING_POLICY_BUSINESS,
                    module=module,
                    category=category,
                ),
                subscription_id=subscription.id,
            )

        if self.is_always_free_listing(module, category):
            return ListingCreationDecision(
                pricing_tier=LISTING_PRICING_FREE,
                visibility=LISTING_VISIBILITY_STANDARD,
                expires_at=now + timedelta(days=30),
                ranking_score=0,
                pricing_policy=LISTING_POLICY_ALWAYS_FREE,
                metadata_patch=self.build_listing_pricing_metadata(
                    policy=LISTING_POLICY_ALWAYS_FREE,
                    module=module,
                    category=category,
                ),
            )

        desired_tier = requested_pricing_tier or LISTING_PRICING_FREE
        if desired_tier == LISTING_PRICING_FREE:
            verification_gate = await self.evaluate_private_trial_verification_gate(user_id)
            if not verification_gate["can_activate"]:
                raise ValueError(
                    "Complete the required verification checks before activating the first private trial."
                )
            if await self._has_private_trial_history(user_id):
                raise PaymentRequiredError(
                    "Your first 7-day private trial is already used. Publish the next listing for 30 days.",
                    PRIVATE_NEXT_PRODUCT_CODE,
                    "private_trial_already_used",
                )
            return ListingCreationDecision(
                pricing_tier=LISTING_PRICING_FREE,
                visibility=LISTING_VISIBILITY_STANDARD,
                expires_at=now + timedelta(days=7),
                ranking_score=0,
                pricing_policy=LISTING_POLICY_PRIVATE_TRIAL,
                metadata_patch=self.build_listing_pricing_metadata(
                    policy=LISTING_POLICY_PRIVATE_TRIAL,
                    module=module,
                    category=category,
                    requires_email_verification=True,
                    requires_phone_verification=True,
                )
                | {"_verification_gate": verification_gate},
            )

        return ListingCreationDecision(
            pricing_tier=LISTING_PRICING_BASIC,
            visibility=LISTING_VISIBILITY_STANDARD,
            expires_at=now + timedelta(days=30),
            ranking_score=0,
            pricing_policy=LISTING_POLICY_PRIVATE_PAID,
            metadata_patch=self.build_listing_pricing_metadata(
                policy=LISTING_POLICY_PRIVATE_PAID,
                module=module,
                category=category,
            ),
            required_product_code=PRIVATE_NEXT_PRODUCT_CODE,
            paywall_reason="private_paid_required",
        )

    async def assert_listing_submission_allowed(self, listing: Listings) -> None:
        pricing_policy = await self.ensure_listing_pricing_metadata(listing)
        if pricing_policy == LISTING_POLICY_ALWAYS_FREE:
            return
        if pricing_policy == LISTING_POLICY_PRIVATE_TRIAL:
            trial_expires_at = listing.created_at + timedelta(days=7)
            if trial_expires_at > self._now():
                return
            raise PaymentRequiredError(
                "Pay €3.99 to complete the 30-day period for this listing.",
                PRIVATE_EXTENSION_PRODUCT_CODE,
                "private_trial_extension_required",
                listing_id=listing.id,
            )
        if listing.pricing_tier == LISTING_PRICING_BASIC:
            if not await self.has_paid_listing_access(listing.id):
                raise PaymentRequiredError(
                    "Complete payment to publish this listing.",
                    PRIVATE_NEXT_PRODUCT_CODE,
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
                    if subscription.plan_code in {"pro", "agency_pro"} and "featured" not in badges:
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
