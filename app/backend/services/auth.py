import logging
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from core.auth import AccessTokenError, create_access_token
from core.config import settings
from core.database import db_manager
from models.auth import AuthSession, OIDCState, User
from sqlalchemy import delete, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _persist_user(self, user: User) -> User:
        result = await self.db.execute(select(User).where(User.id == user.id))
        existing_user = result.scalar_one_or_none()
        last_login = user.last_login or datetime.now(timezone.utc)

        if existing_user:
            existing_user.email = user.email
            existing_user.name = user.name
            existing_user.role = user.role or existing_user.role
            existing_user.last_login = last_login
            await self.db.flush()
            return existing_user

        persisted_user = User(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role or "user",
            last_login=last_login,
        )
        self.db.add(persisted_user)
        await self.db.flush()
        return persisted_user

    async def get_or_create_user(self, platform_sub: str, email: str, name: Optional[str] = None) -> User:
        """Get existing user or create new one."""
        start_time = time.time()
        logger.debug(f"[DB_OP] Starting get_or_create_user - platform_sub: {platform_sub}")
        # Try to find existing user
        result = await self.db.execute(select(User).where(User.id == platform_sub))
        user = result.scalar_one_or_none()
        logger.debug(f"[DB_OP] User lookup completed in {time.time() - start_time:.4f}s - found: {user is not None}")

        if user:
            # Update user info if needed
            user.email = email
            user.name = name
            user.last_login = datetime.now(timezone.utc)
        else:
            # Create new user
            user = User(id=platform_sub, email=email, name=name, last_login=datetime.now(timezone.utc))
            self.db.add(user)

        start_time_commit = time.time()
        logger.debug("[DB_OP] Starting user commit/refresh")
        await self.db.commit()
        await self.db.refresh(user)
        logger.debug(f"[DB_OP] User commit/refresh completed in {time.time() - start_time_commit:.4f}s")
        return user

    async def issue_app_token(
        self,
        user: User,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[str, datetime, Dict[str, Any]]:
        """Generate application JWT token for the authenticated user."""
        user = await self._persist_user(user)

        try:
            expires_minutes = int(getattr(settings, "jwt_expire_minutes", 60))
        except (TypeError, ValueError):
            logger.warning("Invalid JWT_EXPIRE_MINUTES value; fallback to 60 minutes")
            expires_minutes = 60
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=expires_minutes)
        session_id = secrets.token_urlsafe(32)

        self.db.add(
            AuthSession(
                session_id=session_id,
                user_id=user.id,
                user_agent=(user_agent or "")[:512] or None,
                ip_address=(ip_address or "")[:128] or None,
                expires_at=expires_at,
                last_seen_at=now,
            )
        )

        claims: Dict[str, Any] = {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "sid": session_id,
            "token_version": user.token_version,
        }

        if user.name:
            claims["name"] = user.name
        if user.last_login:
            claims["last_login"] = user.last_login.isoformat()
        token = create_access_token(claims, expires_minutes=expires_minutes)

        await self.db.commit()

        return token, expires_at, claims

    async def validate_access_context(
        self,
        user_id: str,
        session_id: Optional[str],
        token_version: Optional[int],
        issued_at: Optional[datetime],
    ) -> User:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise AccessTokenError("Authentication session is no longer valid")

        if session_id is None:
            raise AccessTokenError("Authentication session must be refreshed")

        if token_version is None or token_version != user.token_version:
            raise AccessTokenError("Authentication session has been invalidated")

        if user.tokens_valid_after and issued_at and issued_at <= user.tokens_valid_after:
            raise AccessTokenError("Authentication session has expired")

        result = await self.db.execute(
            select(AuthSession).where(AuthSession.session_id == session_id, AuthSession.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise AccessTokenError("Authentication session is no longer available")

        now = datetime.now(timezone.utc)
        if session.revoked_at is not None:
            raise AccessTokenError("Authentication session has been revoked")
        if session.expires_at <= now:
            raise AccessTokenError("Authentication session has expired")

        if not session.last_seen_at or (now - session.last_seen_at) >= timedelta(minutes=5):
            session.last_seen_at = now
            await self.db.commit()

        return user

    async def revoke_session(self, user_id: str, session_id: str, reason: str = "logout") -> int:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            update(AuthSession)
            .where(
                AuthSession.user_id == user_id,
                AuthSession.session_id == session_id,
                AuthSession.revoked_at.is_(None),
            )
            .values(revoked_at=now, revoke_reason=reason, last_seen_at=now)
        )
        await self.db.commit()
        return result.rowcount or 0

    async def revoke_all_user_sessions(self, user_id: str, reason: str = "logout_all") -> int:
        now = datetime.now(timezone.utc)
        revoke_result = await self.db.execute(
            update(AuthSession)
            .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
            .values(revoked_at=now, revoke_reason=reason, last_seen_at=now)
        )
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(token_version=User.token_version + 1, tokens_valid_after=now)
        )
        await self.db.commit()
        return revoke_result.rowcount or 0

    async def store_oidc_state(
        self,
        state: str,
        nonce: str,
        code_verifier: str,
        auth_method: Optional[str] = None,
        auth_mode: Optional[str] = None,
    ):
        """Store OIDC state in database."""
        # Clean up expired states first
        await self.db.execute(delete(OIDCState).where(OIDCState.expires_at < datetime.now(timezone.utc)))

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)  # 10 minute expiry

        oidc_state = OIDCState(
            state=state,
            nonce=nonce,
            code_verifier=code_verifier,
            auth_method=auth_method,
            auth_mode=auth_mode,
            expires_at=expires_at,
        )

        self.db.add(oidc_state)
        await self.db.commit()

    async def get_and_delete_oidc_state(self, state: str) -> Optional[dict]:
        """Get and delete OIDC state from database."""
        # Clean up expired states first
        await self.db.execute(delete(OIDCState).where(OIDCState.expires_at < datetime.now(timezone.utc)))

        # Find and validate state
        result = await self.db.execute(select(OIDCState).where(OIDCState.state == state))
        oidc_state = result.scalar_one_or_none()

        if not oidc_state:
            return None

        # Extract data before deleting
        state_data = {
            "nonce": oidc_state.nonce,
            "code_verifier": oidc_state.code_verifier,
            "auth_method": oidc_state.auth_method,
            "auth_mode": oidc_state.auth_mode,
        }

        # Delete the used state (one-time use)
        await self.db.delete(oidc_state)
        await self.db.commit()

        return state_data


async def initialize_admin_user():
    """Initialize admin user if not exists"""
    if "MGX_IGNORE_INIT_ADMIN" in os.environ:
        logger.info("Ignore initialize admin")
        return

    from services.database import initialize_database

    # Ensure database is initialized first
    await initialize_database()

    admin_user_id = getattr(settings, "admin_user_id", "")
    admin_user_email = getattr(settings, "admin_user_email", "")

    if not admin_user_id or not admin_user_email:
        logger.warning("Admin user ID or email not configured, skipping admin initialization")
        return

    async with db_manager.async_session_maker() as db:
        # Check if admin user already exists
        result = await db.execute(select(User).where(User.id == admin_user_id))
        user = result.scalar_one_or_none()

        if user:
            # Update existing user to admin if not already
            if user.role != "admin":
                user.role = "admin"
                user.email = admin_user_email  # Update email too
                await db.commit()
                logger.debug(f"Updated user {admin_user_id} to admin role")
            else:
                logger.debug(f"Admin user {admin_user_id} already exists")
        else:
            # Create new admin user
            admin_user = User(id=admin_user_id, email=admin_user_email, role="admin")
            db.add(admin_user)
            await db.commit()
            logger.debug(f"Created admin user: {admin_user_id} with email: {admin_user_email}")


async def initialize_auth_schema():
    """Backfill auth-related columns for existing databases."""
    if not db_manager.engine:
        return

    async with db_manager.engine.begin() as conn:
        def get_existing_user_columns(sync_conn):
            from sqlalchemy import inspect

            inspector = inspect(sync_conn)
            if "users" not in inspector.get_table_names():
                return set()
            return {column["name"] for column in inspector.get_columns("users")}

        user_columns = await conn.run_sync(get_existing_user_columns)
        if not user_columns:
            return

        if "token_version" not in user_columns:
            await conn.execute(text("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0"))
        if "tokens_valid_after" not in user_columns:
            await conn.execute(text("ALTER TABLE users ADD COLUMN tokens_valid_after TIMESTAMP NULL"))
