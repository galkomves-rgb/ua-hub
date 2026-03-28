import asyncio

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from core.database import Base
from dependencies.auth import get_current_user_id
from dependencies.database import get_db_session
from routers.profiles import router as profiles_router

TEST_USER_ID = "user-1"


async def main() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    app = FastAPI()
    app.include_router(profiles_router)

    async def override_get_db_session():
        async with session_factory() as session:
            yield session

    async def override_get_current_user_id() -> str:
        return TEST_USER_ID

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_current_user_id] = override_get_current_user_id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        payload = {
            "slug": "test-biz",
            "name": "Test Biz",
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

        r1 = await client.post("/api/v1/profiles/business", json=payload)
        print("create:", r1.status_code, r1.json().get("slug") if r1.status_code == 200 else r1.text)

        r2 = await client.get("/api/v1/profiles/business/user/my")
        print("my:", r2.status_code, len(r2.json()) if r2.status_code == 200 else r2.text)

        payload["name"] = "Updated Biz"
        r3 = await client.put("/api/v1/profiles/business/test-biz", json=payload)
        print("update:", r3.status_code, r3.json().get("name") if r3.status_code == 200 else r3.text)

        r4 = await client.post("/api/v1/profiles/business", json=payload)
        print("create_second:", r4.status_code, r4.json().get("detail") if r4.status_code != 200 else "OK")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
