from typing import Annotated

from core.database import get_db
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Database session dependency
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_db_session() -> AsyncSession:
    """Compatibility dependency for routers that expect a named session helper."""
    async for session in get_db():
        yield session
