from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.auth import User
from models.billing import BillingPayment, BillingSubscription
from models.listings import Listings
from models.messages import MessageReport
from models.profiles import BusinessProfile


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