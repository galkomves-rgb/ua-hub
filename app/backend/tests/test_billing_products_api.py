import sys
from types import SimpleNamespace

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.database import Base
from dependencies.database import get_db_session

sys.modules.setdefault("stripe", SimpleNamespace())

from routers.billing import router as billing_router


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def api_client(db_session: AsyncSession):
    test_app = FastAPI()
    test_app.include_router(billing_router)

    async def override_get_db_session():
        yield db_session

    test_app.dependency_overrides[get_db_session] = override_get_db_session

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    test_app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_public_billing_products_expose_backend_catalog(api_client: AsyncClient):
    response = await api_client.get("/api/v1/billing/products")

    assert response.status_code == 200
    body = response.json()
    codes = [item["code"] for item in body]

    assert codes[:5] == [
        "listing_free",
        "listing_extend_30",
        "next_private_listing_30",
        "boost",
        "featured",
    ]
    assert "business_priority" in codes
    assert "agency_starter" in codes

    free_listing = next(item for item in body if item["code"] == "listing_free")
    assert free_listing == {
        "code": "listing_free",
        "title": "First private listing trial",
        "description": "Go live for 7 days for the first paid-type private listing.",
        "category": "listing_trial",
        "target_type": "listing",
        "amount": 0.0,
        "currency": "eur",
        "duration_days": 7,
        "listing_quota": 1,
        "is_recurring": False,
        "billing_mode": "free",
        "trial_days": 7,
    }

    growth_plan = next(item for item in body if item["code"] == "business_priority")
    assert growth_plan["amount"] == 19.99
    assert growth_plan["listing_quota"] == 1
    assert growth_plan["is_recurring"] is True
    assert growth_plan["billing_mode"] == "subscription"
    assert growth_plan["trial_days"] == 14

    extension_product = next(item for item in body if item["code"] == "listing_extend_30")
    assert extension_product["billing_mode"] == "payment"
    assert extension_product["is_recurring"] is False

    featured_product = next(item for item in body if item["code"] == "featured")
    assert featured_product["billing_mode"] == "payment"
    assert featured_product["is_recurring"] is False
