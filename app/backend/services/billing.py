import json
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import stripe
from core.config import settings
from models.billing import BillingAuditLog, BillingEntitlement, BillingPayment, BillingSubscription
from models.listings import Listings
from models.monetization import ListingPromotion
from models.profiles import BusinessProfile
from services.payment import CheckoutError, CheckoutSessionRequest, PaymentService
from services.monetization import (
    BUSINESS_PLAN_PRODUCT_MAP,
    PRODUCT_CATALOG,
    MonetizationService,
    PRIVATE_FREE_PRODUCT_CODE,
    PRIVATE_BASIC_PRODUCT_CODE,
    PROMOTION_BOOST,
    PROMOTION_FEATURED,
)
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


PUBLIC_PRODUCT_CATALOG: dict[str, dict[str, Any]] = {
    PRIVATE_FREE_PRODUCT_CODE: {
        "title": "Free",
        "description": "Go live for 3 days.",
        "category": "listing_trial",
        "target_type": "listing",
        "amount": Decimal("0.00"),
        "currency": "eur",
        "duration_days": 3,
        "listing_quota": 1,
    },
    **PRODUCT_CATALOG,
}


class BillingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.payment_service = PaymentService()

    @staticmethod
    def _serialize_metadata(data: dict[str, Any] | None) -> str:
        return json.dumps(data or {}, ensure_ascii=True)

    @staticmethod
    def _deserialize_metadata(raw_value: str | None) -> dict[str, Any]:
        if not raw_value:
            return {}
        try:
            parsed = json.loads(raw_value)
            return parsed if isinstance(parsed, dict) else {}
        except (TypeError, ValueError):
            return {}

    @staticmethod
    def _parse_badges(raw_value: str | None) -> list[str]:
        if not raw_value:
            return []
        try:
            parsed = json.loads(raw_value)
        except (TypeError, ValueError):
            return []
        if isinstance(parsed, list):
            return [str(item) for item in parsed if isinstance(item, str)]
        return []

    @staticmethod
    def _dump_badges(values: list[str]) -> str:
        return json.dumps(values, ensure_ascii=True)

    @staticmethod
    def _product_to_response(code: str, product: dict[str, Any]) -> dict[str, Any]:
        return {
            "code": code,
            "title": product["title"],
            "description": product["description"],
            "category": product["category"],
            "target_type": product["target_type"],
            "amount": float(product["amount"]),
            "currency": product["currency"],
            "duration_days": product.get("duration_days"),
            "listing_quota": product.get("listing_quota"),
            "is_recurring": product["category"] == "business_subscription",
        }

    def list_public_products(self) -> list[dict[str, Any]]:
        return [
            self._product_to_response(code, product)
            for code, product in PUBLIC_PRODUCT_CATALOG.items()
        ]

    async def _log_audit(
        self,
        action: str,
        payment_id: int | None = None,
        subscription_id: int | None = None,
        entitlement_id: int | None = None,
        actor_user_id: str | None = None,
        from_status: str | None = None,
        to_status: str | None = None,
        notes: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.db.add(
            BillingAuditLog(
                payment_id=payment_id,
                subscription_id=subscription_id,
                entitlement_id=entitlement_id,
                actor_user_id=actor_user_id,
                action=action,
                from_status=from_status,
                to_status=to_status,
                notes=notes,
                metadata_json=self._serialize_metadata(metadata),
            )
        )

    async def _get_owned_listing(self, user_id: str, listing_id: int) -> Listings | None:
        result = await self.db.execute(
            select(Listings).where(Listings.id == listing_id, Listings.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def _get_owned_business(self, user_id: str, business_slug: str) -> BusinessProfile | None:
        result = await self.db.execute(
            select(BusinessProfile).where(
                BusinessProfile.slug == business_slug,
                BusinessProfile.owner_user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def _ensure_checkout_ready(self) -> None:
        if not getattr(settings, "stripe_secret_key", None):
            raise ValueError("Stripe is not configured. Set STRIPE_SECRET_KEY before starting checkout.")

    async def _retrieve_stripe_session(self, session_id: str):
        await self.payment_service._auto_reload_stripe_config()
        return await stripe.checkout.Session.retrieve_async(
            session_id,
            expand=["payment_intent.latest_charge", "invoice"],
        )

    async def _sync_expired_billing_state(self, user_id: str) -> None:
        now = datetime.now(timezone.utc)
        monetization_service = MonetizationService(self.db)
        entitlements_result = await self.db.execute(
            select(BillingEntitlement).where(
                BillingEntitlement.user_id == user_id,
                BillingEntitlement.status == "active",
                BillingEntitlement.ends_at.is_not(None),
                BillingEntitlement.ends_at <= now,
            )
        )
        expired_entitlements = entitlements_result.scalars().all()
        changed = False
        for entitlement in expired_entitlements:
            entitlement.status = "expired"
            changed = True
            if entitlement.listing_id:
                promotion_result = await self.db.execute(
                    select(ListingPromotion).where(
                        ListingPromotion.payment_id == entitlement.payment_id,
                        ListingPromotion.status == "active",
                    )
                )
                for promotion in promotion_result.scalars().all():
                    promotion.status = "expired"
                    promotion.updated_at = now
                await monetization_service.recompute_listing_state(entitlement.listing_id)
            if entitlement.business_profile_id and entitlement.entitlement_type == "business_subscription":
                business = await self.db.get(BusinessProfile, entitlement.business_profile_id)
                if business and business.subscription_renewal_date and business.subscription_renewal_date <= now:
                    business.subscription_plan = None
                    business.subscription_renewal_date = None
                    business.listing_quota = None
                    business.is_premium = False
            await self._log_audit(
                action="entitlement_expired",
                payment_id=entitlement.payment_id,
                entitlement_id=entitlement.id,
                actor_user_id=user_id,
                from_status="active",
                to_status="expired",
            )

        subscriptions_result = await self.db.execute(
            select(BillingSubscription).where(
                BillingSubscription.user_id == user_id,
                BillingSubscription.status == "active",
                BillingSubscription.current_period_end.is_not(None),
                BillingSubscription.current_period_end <= now,
            )
        )
        expired_subscriptions = subscriptions_result.scalars().all()
        for subscription in expired_subscriptions:
            subscription.status = "expired"
            changed = True
            business = await self.db.get(BusinessProfile, subscription.business_profile_id)
            if business and business.subscription_renewal_date and business.subscription_renewal_date <= now:
                business.subscription_plan = None
                business.subscription_renewal_date = None
                business.listing_quota = None
                business.is_premium = False
            await self._log_audit(
                action="subscription_expired",
                subscription_id=subscription.id,
                actor_user_id=user_id,
                from_status="active",
                to_status="expired",
            )

        if changed:
            await self.db.commit()

    async def list_history(self, user_id: str, limit: int = 100) -> list[dict[str, Any]]:
        await self._sync_expired_billing_state(user_id)
        result = await self.db.execute(
            select(BillingPayment, Listings.title, BusinessProfile.name)
            .outerjoin(Listings, Listings.id == BillingPayment.listing_id)
            .outerjoin(BusinessProfile, BusinessProfile.id == BillingPayment.business_profile_id)
            .where(BillingPayment.user_id == user_id)
            .order_by(BillingPayment.created_at.desc(), BillingPayment.id.desc())
            .limit(limit)
        )

        items: list[dict[str, Any]] = []
        for payment, listing_title, business_name in result.all():
            target_label = listing_title or business_name
            items.append(
                {
                    "id": payment.id,
                    "title": payment.title,
                    "product_code": payment.product_code,
                    "product_type": payment.product_type,
                    "target_type": payment.target_type,
                    "target_label": target_label,
                    "status": payment.status,
                    "entitlement_status": payment.entitlement_status,
                    "amount_total": float(payment.amount_total),
                    "currency": payment.currency,
                    "created_at": payment.created_at,
                    "paid_at": payment.paid_at,
                    "period_start": payment.period_start,
                    "period_end": payment.period_end,
                    "receipt_url": payment.receipt_url,
                    "invoice_url": payment.invoice_url,
                    "failure_reason": payment.failure_reason,
                }
            )
        return items

    async def get_overview(self, user_id: str) -> dict[str, Any]:
        await self._sync_expired_billing_state(user_id)
        now = datetime.now(timezone.utc)

        businesses_result = await self.db.execute(
            select(BusinessProfile).where(BusinessProfile.owner_user_id == user_id).order_by(BusinessProfile.created_at.asc())
        )
        businesses = businesses_result.scalars().all()

        subscriptions: list[dict[str, Any]] = []
        total_quota = 0
        active_listings_total = 0
        for business in businesses:
            active_listings = await self.db.scalar(
                select(func.count(Listings.id)).where(
                    Listings.owner_type == "business_profile",
                    Listings.owner_id == business.slug,
                    Listings.status.in_(["active", "published"]),
                )
            )
            active_listings_count = int(active_listings or 0)
            active_listings_total += active_listings_count
            quota = int(business.listing_quota or 0)
            total_quota += quota

            subscription_payment = await self.db.scalar(
                select(BillingPayment.status)
                .where(
                    BillingPayment.business_profile_id == business.id,
                    BillingPayment.product_type == "business_subscription",
                )
                .order_by(BillingPayment.created_at.desc())
                .limit(1)
            )

            subscriptions.append(
                {
                    "business_profile_id": business.id,
                    "slug": business.slug,
                    "business_name": business.name,
                    "plan_code": business.subscription_plan,
                    "subscription_status": (
                        "active"
                        if business.subscription_renewal_date and business.subscription_renewal_date > now and business.subscription_plan
                        else "inactive"
                    ),
                    "payment_status": subscription_payment,
                    "renewal_date": business.subscription_renewal_date,
                    "listing_quota": business.listing_quota,
                    "active_listings_count": active_listings_count,
                    "remaining_listing_quota": max(quota - active_listings_count, 0) if quota else 0,
                    "is_premium": bool(business.is_premium),
                }
            )

        boosts_result = await self.db.execute(
            select(BillingEntitlement, BillingPayment, Listings.title)
            .join(BillingPayment, BillingPayment.id == BillingEntitlement.payment_id)
            .join(Listings, Listings.id == BillingEntitlement.listing_id)
            .where(
                BillingEntitlement.user_id == user_id,
                BillingEntitlement.status == "active",
                BillingEntitlement.entitlement_type.in_([PROMOTION_FEATURED, PROMOTION_BOOST]),
            )
            .order_by(BillingEntitlement.ends_at.asc().nullslast(), BillingEntitlement.created_at.desc())
        )
        active_boosts = [
            {
                "payment_id": payment.id,
                "listing_id": entitlement.listing_id,
                "listing_title": listing_title,
                "product_code": payment.product_code,
                "entitlement_type": entitlement.entitlement_type,
                "status": entitlement.status,
                "starts_at": entitlement.starts_at,
                "ends_at": entitlement.ends_at,
            }
            for entitlement, payment, listing_title in boosts_result.all()
        ]

        payment_counts = await self.db.execute(
            select(BillingPayment.status, func.count(BillingPayment.id), func.coalesce(func.sum(BillingPayment.amount_total), 0))
            .where(BillingPayment.user_id == user_id)
            .group_by(BillingPayment.status)
        )
        summary_map = {row[0]: {"count": int(row[1]), "sum": float(row[2] or 0)} for row in payment_counts.all()}
        total_spend = sum(item["sum"] for status, item in summary_map.items() if status == "paid")

        return {
            "currency": "eur",
            "business_subscriptions": subscriptions,
            "active_boosts": active_boosts,
            "usage": {
                "active_listings_count": active_listings_total,
                "total_listing_quota": total_quota,
                "remaining_listing_quota": max(total_quota - active_listings_total, 0),
                "active_boosts_count": len(active_boosts),
            },
            "payment_summary": {
                "paid_payments_count": summary_map.get("paid", {}).get("count", 0),
                "pending_payments_count": summary_map.get("pending", {}).get("count", 0),
                "failed_payments_count": summary_map.get("failed", {}).get("count", 0)
                + summary_map.get("canceled", {}).get("count", 0)
                + summary_map.get("expired", {}).get("count", 0),
                "total_spend": total_spend,
                "currency": "eur",
            },
            "available_products": [
                self._product_to_response(code, product) for code, product in PRODUCT_CATALOG.items()
            ],
        }

    async def create_checkout_session(
        self,
        user_id: str,
        product_code: str,
        business_slug: str | None = None,
        listing_id: int | None = None,
        success_url: str | None = None,
        cancel_url: str | None = None,
    ) -> dict[str, Any]:
        product = PRODUCT_CATALOG.get(product_code)
        if not product:
            raise ValueError("Unsupported billing product")

        target_type = product["target_type"]
        owned_listing = None
        owned_business = None

        if target_type == "listing":
            if not listing_id:
                raise ValueError("listing_id is required for listing billing products")
            owned_listing = await self._get_owned_listing(user_id, listing_id)
            if not owned_listing:
                raise ValueError("Listing not found or does not belong to the current user")
        elif target_type == "business_profile":
            if not business_slug:
                raise ValueError("business_slug is required for business billing products")
            owned_business = await self._get_owned_business(user_id, business_slug)
            if not owned_business:
                raise ValueError("Business profile not found or does not belong to the current user")

        await self._ensure_checkout_ready()

        payment = BillingPayment(
            user_id=user_id,
            business_profile_id=owned_business.id if owned_business else None,
            listing_id=owned_listing.id if owned_listing else None,
            provider="stripe",
            product_code=product_code,
            product_type=product["category"],
            target_type=target_type,
            title=product["title"],
            status="pending",
            entitlement_status="pending",
            amount_total=product["amount"],
            currency=product["currency"],
            checkout_mode=product.get("checkout_mode", "payment"),
            metadata_json=self._serialize_metadata(
                {
                    "business_slug": business_slug,
                    "listing_id": listing_id,
                }
            ),
        )
        self.db.add(payment)
        await self.db.flush()

        frontend_base = (getattr(settings, "frontend_url", "") or "").rstrip("/")
        computed_success_url = success_url or getattr(settings, "stripe_success_url", None)
        computed_cancel_url = cancel_url or getattr(settings, "stripe_cancel_url", None)
        if not computed_success_url:
            computed_success_url = f"{frontend_base}/account?tab=billing&checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
        if not computed_cancel_url:
            computed_cancel_url = f"{frontend_base}/account?tab=billing&checkout=cancel&payment_id={payment.id}"

        try:
            session = await self.payment_service.create_checkout_session(
                CheckoutSessionRequest(
                    amount=product["amount"],
                    currency=product["currency"],
                    quantity=1,
                    mode="payment",
                    ui_mode="hosted",
                    success_url=computed_success_url,
                    cancel_url=computed_cancel_url,
                    metadata={
                        "payment_id": str(payment.id),
                        "user_id": user_id,
                        "product_code": product_code,
                        "target_type": target_type,
                        "business_slug": business_slug or "",
                        "listing_id": str(listing_id or ""),
                    },
                    idempotency_key=f"billing:{payment.id}",
                )
            )
            payment.stripe_session_id = session.session_id
            await self._log_audit(
                action="checkout_session_created",
                payment_id=payment.id,
                actor_user_id=user_id,
                to_status="pending",
                metadata={"session_id": session.session_id, "product_code": product_code},
            )
            await self.db.commit()
            await self.db.refresh(payment)
            return {
                "payment_id": payment.id,
                "session_id": session.session_id,
                "checkout_url": session.url,
            }
        except (CheckoutError, ValueError) as exc:
            payment.status = "failed"
            payment.failure_reason = str(exc)
            await self._log_audit(
                action="checkout_session_failed",
                payment_id=payment.id,
                actor_user_id=user_id,
                from_status="pending",
                to_status="failed",
                notes=str(exc),
            )
            await self.db.commit()
            raise

    async def _activate_payment_from_session(self, payment: BillingPayment, stripe_session) -> BillingPayment:
        if payment.status == "paid":
            return payment

        product = PRODUCT_CATALOG[payment.product_code]
        metadata = self._deserialize_metadata(payment.metadata_json)
        now = datetime.now(timezone.utc)
        period_start = now
        period_end = None
        if product.get("duration_days"):
            period_end = now + timedelta(days=int(product["duration_days"]))

        payment.status = "paid"
        payment.entitlement_status = "active" if product["category"] != "verification_fee" else "not_applicable"
        payment.paid_at = now
        payment.period_start = period_start
        payment.period_end = period_end
        payment.stripe_payment_intent_id = getattr(stripe_session, "payment_intent", None)

        latest_charge = None
        payment_intent = getattr(stripe_session, "payment_intent", None)
        if payment_intent and hasattr(payment_intent, "latest_charge"):
            latest_charge = payment_intent.latest_charge
        if latest_charge is not None:
            payment.receipt_url = getattr(latest_charge, "receipt_url", None)

        invoice = getattr(stripe_session, "invoice", None)
        if invoice is not None:
            payment.stripe_invoice_id = getattr(invoice, "id", None)
            payment.invoice_url = getattr(invoice, "hosted_invoice_url", None)

        monetization_service = MonetizationService(self.db)

        if product["category"] == "listing_purchase":
            listing = await self.db.get(Listings, payment.listing_id)
            if listing:
                listing.pricing_tier = product["pricing_tier"]
                listing.visibility = product["visibility"]
                listing.expiry_date = period_end
                listing.updated_at = now
                await monetization_service.recompute_listing_state(listing.id)

        elif product["category"] == "listing_promotion":
            entitlement = BillingEntitlement(
                user_id=payment.user_id,
                payment_id=payment.id,
                listing_id=payment.listing_id,
                entitlement_type=product["promotion_type"],
                status="active",
                starts_at=period_start,
                ends_at=period_end,
                metadata_json=self._serialize_metadata(metadata),
            )
            self.db.add(entitlement)
            promotion = ListingPromotion(
                listing_id=payment.listing_id,
                payment_id=payment.id,
                promotion_type=product["promotion_type"],
                status="active",
                starts_at=period_start,
                expires_at=period_end,
            )
            self.db.add(promotion)
            await self.db.flush()
            await monetization_service.recompute_listing_state(payment.listing_id)
            await self._log_audit(
                action="listing_entitlement_activated",
                payment_id=payment.id,
                entitlement_id=entitlement.id,
                actor_user_id=payment.user_id,
                from_status="pending",
                to_status="active",
                metadata={"listing_id": payment.listing_id, "entitlement_type": product["promotion_type"]},
            )

        elif product["category"] == "business_subscription":
            await self.db.execute(
                update(BillingSubscription)
                .where(
                    BillingSubscription.business_profile_id == payment.business_profile_id,
                    BillingSubscription.status == "active",
                )
                .values(status="replaced", current_period_end=now)
            )
            subscription = BillingSubscription(
                user_id=payment.user_id,
                business_profile_id=payment.business_profile_id,
                plan_code=product["plan_code"],
                status="active",
                provider="stripe",
                billing_cycle="monthly",
                current_period_start=period_start,
                current_period_end=period_end,
                next_renewal_at=period_end,
                cancel_at_period_end=False,
                last_payment_id=payment.id,
            )
            self.db.add(subscription)
            await self.db.flush()
            entitlement = BillingEntitlement(
                user_id=payment.user_id,
                payment_id=payment.id,
                subscription_id=subscription.id,
                business_profile_id=payment.business_profile_id,
                entitlement_type="business_subscription",
                status="active",
                starts_at=period_start,
                ends_at=period_end,
                metadata_json=self._serialize_metadata(metadata),
            )
            self.db.add(entitlement)
            business = await self.db.get(BusinessProfile, payment.business_profile_id)
            if business:
                business.subscription_plan = product["plan_code"]
                business.subscription_request_status = "approved"
                business.subscription_requested_plan = None
                business.subscription_requested_at = None
                business.subscription_renewal_date = period_end
                business.listing_quota = product["listing_quota"]
                business.is_premium = bool(product.get("is_premium"))
            await self.db.flush()
            listings_result = await self.db.execute(
                select(Listings.id).where(
                    Listings.owner_type == "business_profile",
                    Listings.owner_id == business.slug if business else "",
                )
            )
            for listing_id in listings_result.scalars().all():
                await monetization_service.recompute_listing_state(int(listing_id))
            await self._log_audit(
                action="business_subscription_activated",
                payment_id=payment.id,
                subscription_id=subscription.id,
                entitlement_id=entitlement.id,
                actor_user_id=payment.user_id,
                from_status="pending",
                to_status="active",
                metadata={"business_profile_id": payment.business_profile_id, "plan_code": product["plan_code"]},
            )

        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def verify_checkout_session(self, user_id: str, session_id: str) -> dict[str, Any]:
        payment_result = await self.db.execute(
            select(BillingPayment).where(
                BillingPayment.user_id == user_id,
                BillingPayment.stripe_session_id == session_id,
            )
        )
        payment = payment_result.scalar_one_or_none()
        if not payment:
            raise ValueError("Billing payment not found for this checkout session")

        stripe_session = await self._retrieve_stripe_session(session_id)
        payment_status = getattr(stripe_session, "payment_status", "unpaid")
        session_status = getattr(stripe_session, "status", "open")

        if payment_status == "paid":
            payment = await self._activate_payment_from_session(payment, stripe_session)
        elif session_status == "expired":
            previous_status = payment.status
            payment.status = "expired"
            payment.failure_reason = "Checkout session expired"
            await self._log_audit(
                action="checkout_session_expired",
                payment_id=payment.id,
                actor_user_id=user_id,
                from_status=previous_status,
                to_status="expired",
            )
            await self.db.commit()
            await self.db.refresh(payment)

        history_items = await self.list_history(user_id, limit=200)
        for item in history_items:
            if item["id"] == payment.id:
                return item
        raise ValueError("Unable to serialize verified billing payment")

    async def process_webhook(self, payload: bytes, signature: str | None) -> None:
        webhook_secret = getattr(settings, "stripe_webhook_secret", None)
        if not webhook_secret:
            raise ValueError("STRIPE_WEBHOOK_SECRET is not configured")
        if not signature:
            raise ValueError("Stripe signature header is missing")

        try:
            event = stripe.Webhook.construct_event(payload=payload, sig_header=signature, secret=webhook_secret)
        except Exception as exc:
            raise ValueError(f"Failed to validate Stripe webhook: {exc}") from exc

        event_type = event.get("type")
        data_object = event.get("data", {}).get("object", {})

        if event_type == "checkout.session.completed":
            session_id = data_object.get("id")
            payment_result = await self.db.execute(
                select(BillingPayment).where(BillingPayment.stripe_session_id == session_id)
            )
            payment = payment_result.scalar_one_or_none()
            if payment:
                stripe_session = await self._retrieve_stripe_session(session_id)
                await self._activate_payment_from_session(payment, stripe_session)
        elif event_type == "checkout.session.expired":
            session_id = data_object.get("id")
            payment_result = await self.db.execute(
                select(BillingPayment).where(BillingPayment.stripe_session_id == session_id)
            )
            payment = payment_result.scalar_one_or_none()
            if payment and payment.status == "pending":
                payment.status = "expired"
                payment.failure_reason = "Checkout session expired"
                await self._log_audit(
                    action="webhook_checkout_expired",
                    payment_id=payment.id,
                    actor_user_id=payment.user_id,
                    from_status="pending",
                    to_status="expired",
                )
                await self.db.commit()
        elif event_type == "charge.refunded":
            payment_intent = data_object.get("payment_intent")
            payment_result = await self.db.execute(
                select(BillingPayment).where(BillingPayment.stripe_payment_intent_id == payment_intent)
            )
            payment = payment_result.scalar_one_or_none()
            if payment:
                payment.status = "refunded"
                payment.refunded_at = datetime.now(timezone.utc)
                payment.entitlement_status = "revoked"
                await self._log_audit(
                    action="payment_refunded",
                    payment_id=payment.id,
                    actor_user_id=payment.user_id,
                    from_status="paid",
                    to_status="refunded",
                )
                entitlement_result = await self.db.execute(
                    select(BillingEntitlement).where(BillingEntitlement.payment_id == payment.id)
                )
                for entitlement in entitlement_result.scalars().all():
                    entitlement.status = "revoked"
                await self.db.commit()

    async def admin_override_payment(
        self,
        payment_id: int,
        admin_user_id: str,
        payment_status: str,
        entitlement_status: str | None = None,
        note: str | None = None,
    ) -> dict[str, Any]:
        payment = await self.db.get(BillingPayment, payment_id)
        if not payment:
            raise ValueError("Billing payment not found")

        previous_status = payment.status
        payment.status = payment_status
        if payment_status == "paid" and not payment.paid_at:
            payment.paid_at = datetime.now(timezone.utc)
        if payment_status in {"canceled", "failed"} and not payment.canceled_at:
            payment.canceled_at = datetime.now(timezone.utc)
        if entitlement_status is not None:
            payment.entitlement_status = entitlement_status
            entitlement_result = await self.db.execute(
                select(BillingEntitlement).where(BillingEntitlement.payment_id == payment.id)
            )
            for entitlement in entitlement_result.scalars().all():
                entitlement.status = entitlement_status

        await self._log_audit(
            action="admin_payment_override",
            payment_id=payment.id,
            actor_user_id=admin_user_id,
            from_status=previous_status,
            to_status=payment.status,
            notes=note,
            metadata={"entitlement_status": entitlement_status},
        )
        await self.db.commit()
        history_items = await self.list_history(payment.user_id, limit=200)
        for item in history_items:
            if item["id"] == payment.id:
                return item
        raise ValueError("Unable to serialize overridden billing payment")
