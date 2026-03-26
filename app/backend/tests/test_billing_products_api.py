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

    assert codes[:4] == [
        "listing_free",
        "listing_basic",
        "promotion_boost",
        "promotion_featured",
    ]
    assert "business_growth" in codes

    free_listing = next(item for item in body if item["code"] == "listing_free")
    assert free_listing == {
        "code": "listing_free",
        "title": "Free",
        "description": "Go live for 3 days.",
        "category": "listing_trial",
        "target_type": "listing",
        "amount": 0.0,
        "currency": "eur",
        "duration_days": 3,
        "listing_quota": 1,
        "is_recurring": False,
    }

    growth_plan = next(item for item in body if item["code"] == "business_growth")
    assert growth_plan["amount"] == 24.0
    assert growth_plan["listing_quota"] == 20
    assert growth_plan["is_recurring"] is True
