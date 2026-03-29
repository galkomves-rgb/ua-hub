import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.database import Base
from dependencies.auth import get_current_user_id
from dependencies.database import get_db_session
from routers.profiles import router as profiles_router


TEST_USER_ID = "user-1"


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
    test_app.include_router(profiles_router)

    async def override_get_db_session():
        yield db_session

    async def override_get_current_user_id() -> str:
        return TEST_USER_ID

    test_app.dependency_overrides[get_db_session] = override_get_db_session
    test_app.dependency_overrides[get_current_user_id] = override_get_current_user_id

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    test_app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_business_profile_generates_unique_slug_when_missing(api_client: AsyncClient):
    payload = {
        "name": "Crypto Risk App",
        "category": "services",
        "city": "Kyiv",
        "description": "desc",
        "logo_url": None,
        "cover_url": None,
        "contacts_json": "{}",
        "tags_json": "[]",
        "rating": "0",
        "website": None,
        "social_links_json": "[]",
        "service_areas_json": "[]",
    }

    response_one = await api_client.post("/api/v1/profiles/business", json=payload)
    response_two = await api_client.post("/api/v1/profiles/business", json=payload)

    assert response_one.status_code == 200
    assert response_one.json()["slug"] == "crypto-risk-app"

    assert response_two.status_code == 200
    assert response_two.json()["slug"] == "crypto-risk-app-2"
