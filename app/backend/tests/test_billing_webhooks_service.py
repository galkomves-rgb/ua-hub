import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from core.database import Base
from models.billing import BillingPayment, BillingSubscription, BillingWebhookEvent
from models.profiles import BusinessProfile

sys.modules.setdefault("stripe", SimpleNamespace())

import services.billing as billing_module
from services.billing import BillingService


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_subscription_checkout_requires_stripe_price_id(monkeypatch, db_session):
    business = BusinessProfile(
        owner_user_id="user-1",
        slug="biz-one",
        name="Biz One",
        category="Legal",
        city="Madrid",
        description="desc",
    )
    db_session.add(business)
    await db_session.commit()

    monkeypatch.setattr(billing_module.settings, "stripe_secret_key", "sk_test", raising=False)

    with pytest.raises(ValueError, match="Stripe Price ID is not configured for subscription product 'business_presence'"):
        await BillingService(db_session).create_checkout_session(
            user_id="user-1",
            product_code="business_presence",
            business_slug="biz-one",
        )


@pytest.mark.asyncio
async def test_subscription_webhook_events_are_idempotent_and_create_trialing_subscription(monkeypatch, db_session):
    now = datetime.now(timezone.utc)
    business = BusinessProfile(
        owner_user_id="user-1",
        slug="biz-one",
        name="Biz One",
        category="Legal",
        city="Madrid",
        description="desc",
    )
    db_session.add(business)
    await db_session.commit()

    event = {
        "id": "evt_subscription_created_1",
        "type": "customer.subscription.created",
        "data": {
            "object": {
                "id": "sub_trial_1",
                "status": "trialing",
                "metadata": {
                    "business_slug": "biz-one",
                    "user_id": "user-1",
                    "product_code": "business_presence",
                },
                "current_period_start": int(now.timestamp()),
                "current_period_end": int((now + timedelta(days=14)).timestamp()),
                "cancel_at_period_end": False,
            }
        },
    }

    monkeypatch.setattr(
        billing_module.stripe,
        "Webhook",
        SimpleNamespace(construct_event=lambda payload, sig_header, secret: event),
        raising=False,
    )
    monkeypatch.setattr(billing_module.settings, "stripe_webhook_secret", "whsec_test", raising=False)

    service = BillingService(db_session)
    await service.process_webhook(b"subscription-created", "sig")
    await service.process_webhook(b"subscription-created", "sig")

    subscription_result = await db_session.execute(select(BillingSubscription))
    subscriptions = subscription_result.scalars().all()
    assert len(subscriptions) == 1
    assert subscriptions[0].stripe_subscription_id == "sub_trial_1"
    assert subscriptions[0].status == "trialing"
    assert subscriptions[0].plan_code == "business_presence"

    event_result = await db_session.execute(select(BillingWebhookEvent))
    events = event_result.scalars().all()
    assert len(events) == 1
    assert events[0].status == "processed"


@pytest.mark.asyncio
async def test_invoice_and_subscription_webhooks_sync_status_transitions(monkeypatch, db_session):
    now = datetime.now(timezone.utc)
    business = BusinessProfile(
        owner_user_id="user-1",
        slug="biz-one",
        name="Biz One",
        category="Legal",
        city="Madrid",
        description="desc",
    )
    db_session.add(business)
    await db_session.flush()
    payment = BillingPayment(
        user_id="user-1",
        business_profile_id=business.id,
        provider="stripe",
        product_code="business_priority",
        product_type="business_subscription",
        target_type="business_profile",
        title="Business Priority",
        status="pending",
        entitlement_status="pending",
        amount_total=Decimal("19.99"),
        currency="eur",
        checkout_mode="subscription",
        stripe_session_id="cs_test_1",
        metadata_json='{"business_slug":"biz-one","user_id":"user-1","product_code":"business_priority"}',
    )
    db_session.add(payment)
    await db_session.commit()

    subscription_states = {
        "active": {
            "id": "sub_exec_1",
            "status": "active",
            "metadata": {
                "business_slug": "biz-one",
                "user_id": "user-1",
                "product_code": "business_priority",
            },
            "current_period_start": int(now.timestamp()),
            "current_period_end": int((now + timedelta(days=30)).timestamp()),
            "cancel_at_period_end": False,
        },
        "past_due": {
            "id": "sub_exec_1",
            "status": "past_due",
            "metadata": {
                "business_slug": "biz-one",
                "user_id": "user-1",
                "product_code": "business_priority",
            },
            "current_period_start": int(now.timestamp()),
            "current_period_end": int((now + timedelta(days=30)).timestamp()),
            "cancel_at_period_end": False,
        },
        "canceled": {
            "id": "sub_exec_1",
            "status": "canceled",
            "metadata": {
                "business_slug": "biz-one",
                "user_id": "user-1",
                "product_code": "business_priority",
            },
            "current_period_start": int(now.timestamp()),
            "current_period_end": int((now + timedelta(days=30)).timestamp()),
            "cancel_at_period_end": True,
        },
    }

    event_map = {
        b"checkout-completed": {
            "id": "evt_checkout_completed_1",
            "type": "checkout.session.completed",
            "data": {"object": {"id": "cs_test_1"}},
        },
        b"invoice-paid": {
            "id": "evt_invoice_paid_1",
            "type": "invoice.paid",
            "data": {
                "object": {
                    "id": "in_paid_1",
                    "subscription": "sub_exec_1",
                    "currency": "eur",
                    "amount_paid": 1999,
                    "hosted_invoice_url": "https://example.com/invoice/paid",
                }
            },
        },
        b"invoice-failed": {
            "id": "evt_invoice_failed_1",
            "type": "invoice.payment_failed",
            "data": {
                "object": {
                    "id": "in_failed_1",
                    "subscription": "sub_exec_1",
                    "currency": "eur",
                    "amount_due": 1999,
                    "hosted_invoice_url": "https://example.com/invoice/failed",
                    "last_finalization_error": {"message": "Card was declined"},
                }
            },
        },
        b"subscription-deleted": {
            "id": "evt_subscription_deleted_1",
            "type": "customer.subscription.deleted",
            "data": {
                "object": subscription_states["canceled"],
            },
        },
    }

    def construct_event(payload, sig_header, secret):
        return event_map[payload]

    async def retrieve_session(session_id):
        return SimpleNamespace(
            id=session_id,
            status="complete",
            payment_status="unpaid",
            subscription="sub_exec_1",
            payment_intent=None,
            invoice=None,
        )

    async def retrieve_subscription(subscription_id):
        if subscription_id == "sub_exec_1" and last_state["value"] == "active":
            return subscription_states["active"]
        if subscription_id == "sub_exec_1" and last_state["value"] == "past_due":
            return subscription_states["past_due"]
        return subscription_states["canceled"]

    async def noop_auto_reload():
        return None

    monkeypatch.setattr(
        billing_module.stripe,
        "Webhook",
        SimpleNamespace(construct_event=construct_event),
        raising=False,
    )
    monkeypatch.setattr(billing_module.settings, "stripe_webhook_secret", "whsec_test", raising=False)
    monkeypatch.setattr(billing_module.PaymentService, "_auto_reload_stripe_config", staticmethod(noop_auto_reload))
    monkeypatch.setattr(billing_module.stripe, "Subscription", SimpleNamespace(retrieve_async=retrieve_subscription), raising=False)

    service = BillingService(db_session)
    monkeypatch.setattr(service, "_retrieve_stripe_session", retrieve_session)

    last_state = {"value": "active"}
    await service.process_webhook(b"checkout-completed", "sig")
    subscription = (await db_session.execute(select(BillingSubscription))).scalars().one()
    assert subscription.status == "active"
    assert subscription.stripe_subscription_id == "sub_exec_1"

    await service.process_webhook(b"invoice-paid", "sig")
    paid_payment = (await db_session.execute(select(BillingPayment).where(BillingPayment.stripe_invoice_id == "in_paid_1"))).scalar_one()
    assert paid_payment.status == "paid"
    assert paid_payment.checkout_mode == "subscription"

    last_state["value"] = "past_due"
    await service.process_webhook(b"invoice-failed", "sig")
    refreshed_subscription = await db_session.get(BillingSubscription, subscription.id)
    assert refreshed_subscription is not None
    assert refreshed_subscription.status == "past_due"
    failed_payment = (await db_session.execute(select(BillingPayment).where(BillingPayment.stripe_invoice_id == "in_failed_1"))).scalar_one()
    assert failed_payment.status == "failed"
    assert failed_payment.failure_reason == "Card was declined"

    last_state["value"] = "canceled"
    await service.process_webhook(b"subscription-deleted", "sig")
    canceled_subscription = await db_session.get(BillingSubscription, subscription.id)
    assert canceled_subscription is not None
    assert canceled_subscription.status == "canceled"
