from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.auth import User
from models.billing import BillingPayment, BillingSubscription
from models.listings import Listings
from models.messages import MessageReport
from models.profiles import BusinessProfile, UserProfile


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_overview(self) -> dict:
        moderation_pending_count = int(
            await self.db.scalar(select(func.count(Listings.id)).where(Listings.status == "moderation_pending")) or 0
        )
        rejected_listings_count = int(
            await self.db.scalar(select(func.count(Listings.id)).where(Listings.status == "rejected")) or 0
        )
        published_listings_count = int(
            await self.db.scalar(select(func.count(Listings.id)).where(Listings.status.in_(["published", "active"]))) or 0
        )
        total_listings_count = int(await self.db.scalar(select(func.count(Listings.id))) or 0)
        total_users_count = int(await self.db.scalar(select(func.count(User.id))) or 0)
        total_business_profiles_count = int(await self.db.scalar(select(func.count(BusinessProfile.id))) or 0)
        open_reports_count = int(
            await self.db.scalar(select(func.count(MessageReport.id)).where(MessageReport.status == "pending")) or 0
        )
        pending_payments_count = int(
            await self.db.scalar(select(func.count(BillingPayment.id)).where(BillingPayment.status == "pending")) or 0
        )
        payment_issues_count = int(
            await self.db.scalar(select(func.count(BillingPayment.id)).where(BillingPayment.status.in_(["failed", "expired", "canceled"]))) or 0
        )
        active_subscriptions_count = int(
            await self.db.scalar(select(func.count(BillingSubscription.id)).where(BillingSubscription.status == "active")) or 0
        )

        recent_pending_listings_result = await self.db.execute(
            select(Listings)
            .where(Listings.status == "moderation_pending")
            .order_by(Listings.updated_at.desc(), Listings.created_at.desc())
            .limit(5)
        )
        recent_pending_listings = [
            {
                "id": listing.id,
                "title": listing.title,
                "module": listing.module,
                "category": listing.category,
                "status": listing.status,
                "created_at": listing.created_at,
                "updated_at": listing.updated_at,
            }
            for listing in recent_pending_listings_result.scalars().all()
        ]

        recent_reports_result = await self.db.execute(
            select(MessageReport)
            .where(MessageReport.status == "pending")
            .order_by(MessageReport.created_at.desc())
            .limit(5)
        )
        recent_reports = [
            {
                "id": report.id,
                "reported_user_id": report.reported_user_id,
                "listing_id": report.listing_id,
                "reason": report.reason,
                "status": report.status,
                "created_at": report.created_at,
            }
            for report in recent_reports_result.scalars().all()
        ]

        recent_payment_issues_result = await self.db.execute(
            select(BillingPayment)
            .where(BillingPayment.status.in_(["failed", "expired", "canceled"]))
            .order_by(BillingPayment.created_at.desc())
            .limit(5)
        )
        recent_payment_issues = [
            {
                "id": payment.id,
                "title": payment.title,
                "status": payment.status,
                "amount_total": float(payment.amount_total),
                "currency": payment.currency,
                "created_at": payment.created_at,
                "failure_reason": payment.failure_reason,
            }
            for payment in recent_payment_issues_result.scalars().all()
        ]

        return {
            "counts": {
                "moderation_pending_count": moderation_pending_count,
                "rejected_listings_count": rejected_listings_count,
                "published_listings_count": published_listings_count,
                "total_listings_count": total_listings_count,
                "total_users_count": total_users_count,
                "total_business_profiles_count": total_business_profiles_count,
                "open_reports_count": open_reports_count,
                "pending_payments_count": pending_payments_count,
                "payment_issues_count": payment_issues_count,
                "active_subscriptions_count": active_subscriptions_count,
            },
            "recent_pending_listings": recent_pending_listings,
            "recent_reports": recent_reports,
            "recent_payment_issues": recent_payment_issues,
        }

    async def list_reports(self, status: str | None = None, query_text: str | None = None, limit: int = 20, offset: int = 0) -> dict:
        filters = []
        if status and status != "all":
            filters.append(MessageReport.status == status)
        if query_text:
            search_term = f"%{query_text}%"
            filters.append(
                or_(
                    MessageReport.reason.ilike(search_term),
                    MessageReport.details.ilike(search_term),
                    MessageReport.reporter_user_id.ilike(search_term),
                    MessageReport.reported_user_id.ilike(search_term),
                    MessageReport.listing_id.ilike(search_term),
                )
            )

        total_query = select(func.count(MessageReport.id))
        items_query = select(MessageReport).order_by(MessageReport.created_at.desc(), MessageReport.id.desc())
        for condition in filters:
            total_query = total_query.where(condition)
            items_query = items_query.where(condition)

        total = int(await self.db.scalar(total_query) or 0)
        result = await self.db.execute(items_query.limit(limit).offset(offset))
        reports = result.scalars().all()
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "items": [
                {
                    "id": report.id,
                    "reporter_user_id": report.reporter_user_id,
                    "reported_user_id": report.reported_user_id,
                    "listing_id": report.listing_id,
                    "reason": report.reason,
                    "details": report.details,
                    "status": report.status,
                    "moderation_note": report.moderation_note,
                    "reviewed_at": report.reviewed_at,
                    "created_at": report.created_at,
                }
                for report in reports
            ],
        }

    async def review_report(
        self,
        report_id: int,
        status: str,
        moderation_note: str | None,
        admin_user_id: str | None,
    ) -> dict | None:
        if status not in {"pending", "reviewed", "closed"}:
            raise ValueError("Unsupported report status")
        report = await self.db.get(MessageReport, report_id)
        if not report:
            return None
        report.status = status
        report.moderation_note = moderation_note.strip() if moderation_note else None
        report.reviewed_at = None if status == "pending" else datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(report)
        return {
            "id": report.id,
            "reporter_user_id": report.reporter_user_id,
            "reported_user_id": report.reported_user_id,
            "listing_id": report.listing_id,
            "reason": report.reason,
            "details": report.details,
            "status": report.status,
            "moderation_note": report.moderation_note,
            "reviewed_at": report.reviewed_at,
            "created_at": report.created_at,
            "reviewed_by": admin_user_id,
        }

    async def list_billing_payments(self, status: str | None = None, query_text: str | None = None, limit: int = 20, offset: int = 0) -> dict:
        filters = []
        if status and status != "all":
            filters.append(BillingPayment.status == status)
        if query_text:
            search_term = f"%{query_text}%"
            filters.append(
                or_(
                    BillingPayment.title.ilike(search_term),
                    BillingPayment.product_code.ilike(search_term),
                    BillingPayment.user_id.ilike(search_term),
                    BillingPayment.failure_reason.ilike(search_term),
                )
            )

        total_query = select(func.count(BillingPayment.id))
        items_query = (
            select(BillingPayment, Listings.title, BusinessProfile.name)
            .outerjoin(Listings, Listings.id == BillingPayment.listing_id)
            .outerjoin(BusinessProfile, BusinessProfile.id == BillingPayment.business_profile_id)
            .order_by(BillingPayment.created_at.desc(), BillingPayment.id.desc())
        )
        for condition in filters:
            total_query = total_query.where(condition)
            items_query = items_query.where(condition)

        total = int(await self.db.scalar(total_query) or 0)
        result = await self.db.execute(items_query.limit(limit).offset(offset))
        items = []
        for payment, listing_title, business_name in result.all():
            items.append(
                {
                    "id": payment.id,
                    "user_id": payment.user_id,
                    "listing_id": payment.listing_id,
                    "business_profile_id": payment.business_profile_id,
                    "title": payment.title,
                    "product_code": payment.product_code,
                    "product_type": payment.product_type,
                    "target_type": payment.target_type,
                    "target_label": listing_title or business_name,
                    "status": payment.status,
                    "entitlement_status": payment.entitlement_status,
                    "amount_total": float(payment.amount_total),
                    "currency": payment.currency,
                    "created_at": payment.created_at,
                    "paid_at": payment.paid_at,
                    "period_end": payment.period_end,
                    "failure_reason": payment.failure_reason,
                }
            )
        return {"total": total, "limit": limit, "offset": offset, "items": items}

    async def list_users(self, role: str | None = None, query_text: str | None = None, limit: int = 20, offset: int = 0) -> dict:
        filters = []
        if role and role != "all":
            filters.append(User.role == role)
        if query_text:
            search_term = f"%{query_text}%"
            filters.append(or_(User.email.ilike(search_term), User.name.ilike(search_term), User.id.ilike(search_term)))

        total_query = select(func.count(User.id))
        items_query = select(User).order_by(User.created_at.desc(), User.id.asc())
        for condition in filters:
            total_query = total_query.where(condition)
            items_query = items_query.where(condition)

        total = int(await self.db.scalar(total_query) or 0)
        result = await self.db.execute(items_query.limit(limit).offset(offset))
        users = result.scalars().all()
        if not users:
            return {"total": total, "limit": limit, "offset": offset, "items": []}

        user_ids = [user.id for user in users]
        profiles_result = await self.db.execute(select(UserProfile).where(UserProfile.user_id.in_(user_ids)))
        profiles = {profile.user_id: profile for profile in profiles_result.scalars().all()}

        listing_counts_result = await self.db.execute(
            select(Listings.user_id, func.count(Listings.id)).where(Listings.user_id.in_(user_ids)).group_by(Listings.user_id)
        )
        listing_counts = {user_id: int(count) for user_id, count in listing_counts_result.all()}

        business_counts_result = await self.db.execute(
            select(BusinessProfile.owner_user_id, func.count(BusinessProfile.id))
            .where(BusinessProfile.owner_user_id.in_(user_ids))
            .group_by(BusinessProfile.owner_user_id)
        )
        business_counts = {user_id: int(count) for user_id, count in business_counts_result.all()}

        items = []
        for user in users:
            profile = profiles.get(user.id)
            items.append(
                {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "role": user.role,
                    "profile_name": profile.name if profile else None,
                    "city": profile.city if profile else None,
                    "account_type": profile.account_type if profile else None,
                    "is_public_profile": bool(profile.is_public_profile) if profile else False,
                    "show_as_public_author": bool(profile.show_as_public_author) if profile else False,
                    "listings_count": listing_counts.get(user.id, 0),
                    "business_profiles_count": business_counts.get(user.id, 0),
                    "created_at": user.created_at,
                    "last_login": user.last_login,
                }
            )

        return {"total": total, "limit": limit, "offset": offset, "items": items}

    async def update_user_role(self, user_id: str, role: str, admin_user_id: str | None) -> dict | None:
        if role not in {"user", "admin"}:
            raise ValueError("Unsupported user role")
        if admin_user_id and admin_user_id == user_id and role != "admin":
            raise ValueError("Admin cannot remove their own admin role")
        user = await self.db.get(User, user_id)
        if not user:
            return None
        user.role = role
        await self.db.commit()
        profile = (await self.db.execute(select(UserProfile).where(UserProfile.user_id == user_id))).scalar_one_or_none()
        listing_count = int(await self.db.scalar(select(func.count(Listings.id)).where(Listings.user_id == user_id)) or 0)
        business_count = int(await self.db.scalar(select(func.count(BusinessProfile.id)).where(BusinessProfile.owner_user_id == user_id)) or 0)
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "profile_name": profile.name if profile else None,
            "city": profile.city if profile else None,
            "account_type": profile.account_type if profile else None,
            "is_public_profile": bool(profile.is_public_profile) if profile else False,
            "show_as_public_author": bool(profile.show_as_public_author) if profile else False,
            "listings_count": listing_count,
            "business_profiles_count": business_count,
            "created_at": user.created_at,
            "last_login": user.last_login,
        }