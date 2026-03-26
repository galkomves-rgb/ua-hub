import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional

from core.auth import AccessTokenError, decode_access_token
from core.database import get_db
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from schemas.auth import UserResponse
from services.auth import AuthService
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


async def get_bearer_token(
    request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> str:
    """Extract bearer token from Authorization header."""
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials

    logger.debug("Authentication required for request %s %s", request.method, request.url.path)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication credentials were not provided")


def _parse_token_iat(raw_value: object) -> Optional[datetime]:
    if isinstance(raw_value, (int, float)):
        return datetime.fromtimestamp(raw_value, tz=timezone.utc)
    if isinstance(raw_value, str):
        try:
            return datetime.fromisoformat(raw_value)
        except ValueError:
            return None
    return None


async def get_current_user(token: str = Depends(get_bearer_token), db: AsyncSession = Depends(get_db)) -> UserResponse:
    """Dependency to get current authenticated user via JWT token."""
    try:
        payload = decode_access_token(token)
    except AccessTokenError as exc:
        # Log error type only, not the full exception which may contain sensitive token data
        logger.warning("Token validation failed: %s", type(exc).__name__)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    token_version = payload.get("token_version")
    session_id = payload.get("sid")
    issued_at = _parse_token_iat(payload.get("iat"))

    auth_service = AuthService(db)
    try:
        user = await auth_service.validate_access_context(
            user_id=str(user_id),
            session_id=str(session_id) if session_id else None,
            token_version=int(token_version) if token_version is not None else None,
            issued_at=issued_at,
        )
    except AccessTokenError as exc:
        user_hash = hashlib.sha256(str(user_id).encode()).hexdigest()[:8] if user_id else "unknown"
        logger.warning("Session validation failed for user hash %s: %s", user_hash, exc.message)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message)

    return UserResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role,
        last_login=user.last_login,
    )


async def get_admin_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Dependency to ensure current user has admin role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


async def get_current_user_id(current_user: UserResponse = Depends(get_current_user)) -> str:
    """Compatibility dependency returning only the authenticated user ID."""
    return str(current_user.id)
