import pytest

from services import database as database_service


@pytest.mark.asyncio
async def test_initialize_database_repairs_schema_before_creating_tables(monkeypatch):
    calls: list[str] = []

    async def fake_init_db():
        calls.append("init_db")

    async def fake_repair():
        calls.append("repair")

    async def fake_create_tables():
        calls.append("create_tables")

    monkeypatch.delenv("MGX_IGNORE_INIT_DB", raising=False)
    monkeypatch.setattr(database_service.db_manager, "init_db", fake_init_db)
    monkeypatch.setattr(database_service.db_manager, "check_and_repair_existing_tables", fake_repair)
    monkeypatch.setattr(database_service.db_manager, "create_tables", fake_create_tables)

    await database_service.initialize_database()

    assert calls == ["init_db", "repair", "create_tables"]
