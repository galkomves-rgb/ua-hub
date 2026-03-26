from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str  # Now a string UUID (platform sub)
    email: str
    name: Optional[str] = None
    role: str = "user"  # user/admin
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlatformTokenExchangeRequest(BaseModel):
    """Request body for exchanging Platform token for app token."""

    platform_token: str


class TokenExchangeResponse(BaseModel):
    """Response body for issued application token."""

    token: str


class DevLoginRequest(BaseModel):
    role: str = "user"
    email: Optional[str] = None
    name: Optional[str] = None
    user_id: Optional[str] = None


class AuthCapabilitiesResponse(BaseModel):
    google: bool
    apple: bool
    email_login: bool
    email_signup: bool
    phone: bool
    turnstile_enabled: bool
    email_confirmation_required: bool
    dev_auth_enabled: bool = False


class LogoutResponse(BaseModel):
    redirect_url: str
    revoked_sessions: int = 0
