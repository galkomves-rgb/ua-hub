import logging
import os
import time
from typing import Optional
from urllib.parse import urlencode

import httpx
from core.auth import (
    AccessTokenError,
    IDTokenValidationError,
    build_authorization_url,
    build_logout_url,
    decode_access_token,
    generate_code_challenge,
    generate_code_verifier,
    generate_nonce,
    generate_state,
    validate_id_token,
)
from core.config import settings
from core.database import get_db
from dependencies.auth import get_bearer_token, get_current_user
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from models.auth import User
from schemas.auth import (
    AuthCapabilitiesResponse,
    LogoutResponse,
    PlatformTokenExchangeRequest,
    TokenExchangeResponse,
    UserResponse,
)
from services.auth import AuthService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])
logger = logging.getLogger(__name__)

SUPPORTED_AUTH_METHODS = {"google", "apple", "email", "phone"}
SUPPORTED_AUTH_MODES = {"login", "register"}
AUTH_RATE_LIMITS: dict[str, tuple[int, int]] = {
    "login": (5, 300),
    "callback": (20, 300),
    "token_exchange": (10, 300),
    "logout": (20, 300),
    "logout_all": (10, 300),
}
_auth_rate_limit_state: dict[str, list[float]] = {}


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def get_auth_capabilities() -> AuthCapabilitiesResponse:
    google_enabled = _env_flag("OIDC_ENABLE_GOOGLE_AUTH") or bool(getattr(settings, "oidc_google_connection", ""))
    apple_enabled = _env_flag("OIDC_ENABLE_APPLE_AUTH") or bool(getattr(settings, "oidc_apple_connection", ""))
    email_enabled = _env_flag("OIDC_ENABLE_EMAIL_AUTH") or bool(getattr(settings, "oidc_email_connection", ""))
    phone_enabled = _env_flag("OIDC_ENABLE_PHONE_AUTH") or bool(getattr(settings, "oidc_phone_connection", ""))
    turnstile_enabled = bool(getattr(settings, "turnstile_secret_key", ""))
    email_confirmation_required = _env_flag("OIDC_REQUIRE_VERIFIED_EMAIL", default=True)
    return AuthCapabilitiesResponse(
        google=google_enabled,
        apple=apple_enabled,
        email_login=email_enabled,
        email_signup=email_enabled,
        phone=phone_enabled,
        turnstile_enabled=turnstile_enabled,
        email_confirmation_required=email_confirmation_required,
    )


def build_auth_provider_params(method: Optional[str], mode: Optional[str]) -> dict[str, str]:
    if not method and not mode:
        return {}

    capabilities = get_auth_capabilities()
    if method == "google" and not capabilities.google:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google login is not enabled")
    if method == "apple" and not capabilities.apple:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apple login is not enabled")
    if method == "email" and not capabilities.email_login:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email auth is not enabled")
    if method == "phone" and not capabilities.phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone auth is not enabled")

    params: dict[str, str] = {}
    connection_param = getattr(settings, "oidc_connection_param", "connection")
    connection_map = {
        "google": getattr(settings, "oidc_google_connection", ""),
        "apple": getattr(settings, "oidc_apple_connection", ""),
        "email": getattr(settings, "oidc_email_connection", ""),
        "phone": getattr(settings, "oidc_phone_connection", ""),
    }
    connection_value = connection_map.get(method or "", "")
    if method and connection_value:
        params[connection_param] = connection_value

    if mode:
        screen_hint_param = getattr(settings, "oidc_screen_hint_param", "screen_hint")
        if mode == "register":
            params[screen_hint_param] = getattr(settings, "oidc_signup_hint_value", "signup")
        elif mode == "login":
            params[screen_hint_param] = getattr(settings, "oidc_login_hint_value", "login")

    return params


def _get_request_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    client_host = request.client.host if request.client else "unknown"
    return client_host or "unknown"


def _enforce_auth_rate_limit(request: Request, bucket: str) -> None:
    limit, window_seconds = AUTH_RATE_LIMITS[bucket]
    now = time.time()
    key = f"{bucket}:{_get_request_ip(request)}"
    attempts = _auth_rate_limit_state.get(key, [])
    attempts = [attempt for attempt in attempts if now - attempt < window_seconds]

    if len(attempts) >= limit:
        retry_after = max(1, int(window_seconds - (now - attempts[0])))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please retry later.",
            headers={"Retry-After": str(retry_after)},
        )

    attempts.append(now)
    _auth_rate_limit_state[key] = attempts


@router.get("/capabilities", response_model=AuthCapabilitiesResponse)
async def auth_capabilities():
    return get_auth_capabilities()


async def verify_turnstile_token(token: str, remote_ip: str | None = None) -> bool:
    secret = getattr(settings, "turnstile_secret_key", "")
    if not secret:
        return True
    if not token:
        return False

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={
                    "secret": secret,
                    "response": token,
                    **({"remoteip": remote_ip} if remote_ip else {}),
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            payload = response.json()
            return bool(payload.get("success"))
    except Exception as exc:
        logger.warning("Turnstile verification failed: %s", exc)
        return False


def _local_patch(url: str) -> str:
    """Patch URL for local development."""
    if os.getenv("LOCAL_PATCH", "").lower() not in ("true", "1"):
        return url

    patched_url = url.replace("https://", "http://").replace(":8000", ":3000")
    logger.debug("[get_dynamic_backend_url] patching URL from %s to %s", url, patched_url)
    return patched_url


def get_dynamic_backend_url(request: Request) -> str:
    """Get backend URL dynamically from request headers.

    Priority: mgx-external-domain > x-forwarded-host > host > settings.backend_url
    """
    mgx_external_domain = request.headers.get("mgx-external-domain")
    x_forwarded_host = request.headers.get("x-forwarded-host")
    host = request.headers.get("host")
    scheme = request.headers.get("x-forwarded-proto", "https")

    effective_host = mgx_external_domain or x_forwarded_host or host
    if not effective_host:
        logger.warning("[get_dynamic_backend_url] No host found, fallback to %s", settings.backend_url)
        return settings.backend_url

    dynamic_url = _local_patch(f"{scheme}://{effective_host}")
    logger.debug(
        "[get_dynamic_backend_url] mgx-external-domain=%s, x-forwarded-host=%s, host=%s, scheme=%s, dynamic_url=%s",
        mgx_external_domain,
        x_forwarded_host,
        host,
        scheme,
        dynamic_url,
    )
    return dynamic_url


def derive_name_from_email(email: str) -> str:
    return email.split("@", 1)[0] if email else ""


@router.get("/login")
async def login(
    request: Request,
    captcha_token: Optional[str] = None,
    method: Optional[str] = None,
    mode: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Start OIDC login flow with PKCE."""
    _enforce_auth_rate_limit(request, "login")

    if method and method not in SUPPORTED_AUTH_METHODS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported auth method")
    if mode and mode not in SUPPORTED_AUTH_MODES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported auth mode")

    turnstile_enabled = bool(getattr(settings, "turnstile_secret_key", ""))
    if turnstile_enabled:
        remote_ip = _get_request_ip(request)
        is_human = await verify_turnstile_token(captcha_token or "", remote_ip=remote_ip)
        if not is_human:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Human verification failed")

    state = generate_state()
    nonce = generate_nonce()
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)

    # Store state, nonce, and code verifier in database
    auth_service = AuthService(db)
    await auth_service.store_oidc_state(state, nonce, code_verifier, auth_method=method, auth_mode=mode)

    # Build redirect_uri dynamically from request
    backend_url = get_dynamic_backend_url(request)
    redirect_uri = f"{backend_url}/api/v1/auth/callback"
    logger.info("[login] Starting OIDC flow with redirect_uri=%s", redirect_uri)

    provider_params = build_auth_provider_params(method, mode)
    auth_url = build_authorization_url(
        state,
        nonce,
        code_challenge,
        redirect_uri=redirect_uri,
        extra_params=provider_params,
    )
    return RedirectResponse(
        url=auth_url,
        status_code=status.HTTP_302_FOUND,
        headers={"X-Request-ID": state},
    )


@router.get("/callback")
async def callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Handle OIDC callback."""
    _enforce_auth_rate_limit(request, "callback")
    backend_url = get_dynamic_backend_url(request)

    def redirect_with_error(message: str) -> RedirectResponse:
        fragment = urlencode({"msg": message})
        return RedirectResponse(
            url=f"{backend_url}/auth/error?{fragment}",
            status_code=status.HTTP_302_FOUND,
        )

    if error:
        return redirect_with_error(f"OIDC error: {error}")

    if not code or not state:
        return redirect_with_error("Missing code or state parameter")

    # Validate state using database
    auth_service = AuthService(db)
    temp_data = await auth_service.get_and_delete_oidc_state(state)
    if not temp_data:
        return redirect_with_error("Invalid or expired state parameter")

    nonce = temp_data["nonce"]
    code_verifier = temp_data.get("code_verifier")
    auth_method = temp_data.get("auth_method")
    auth_mode = temp_data.get("auth_mode")

    try:
        # Build redirect_uri dynamically from request
        redirect_uri = f"{backend_url}/api/v1/auth/callback"
        logger.info("[callback] Exchanging code for tokens with redirect_uri=%s", redirect_uri)

        # Exchange authorization code for tokens with PKCE
        token_data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": settings.oidc_client_id,
            "client_secret": settings.oidc_client_secret,
        }

        # Add PKCE code verifier if available
        if code_verifier:
            token_data["code_verifier"] = code_verifier

        token_url = f"{settings.oidc_issuer_url}/token"
        try:
            async with httpx.AsyncClient() as client:
                token_response = await client.post(
                    token_url,
                    data=token_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded", "X-Request-ID": state},
                )
        except httpx.HTTPError as e:
            logger.error(
                "[callback] Token exchange HTTP error: url=%s, error=%s",
                token_url,
                str(e),
                exc_info=True,
            )
            return redirect_with_error(f"Token exchange failed: {e}")

        if token_response.status_code != 200:
            logger.error(
                "[callback] Token exchange failed: url=%s, status_code=%s, response=%s",
                token_url,
                token_response.status_code,
                token_response.text,
            )
            return redirect_with_error(f"Token exchange failed: {token_response.text}")

        tokens = token_response.json()

        # Validate ID token
        id_token = tokens.get("id_token")
        if not id_token:
            return redirect_with_error("No ID token received")

        id_claims = await validate_id_token(id_token)

        # Validate nonce
        if id_claims.get("nonce") != nonce:
            return redirect_with_error("Invalid nonce")

        email_confirmation_required = get_auth_capabilities().email_confirmation_required
        email_verified = bool(id_claims.get("email_verified"))
        is_email_flow = auth_method == "email" or auth_mode == "register"
        if email_confirmation_required and is_email_flow and not email_verified:
            return redirect_with_error("Please confirm your email address before continuing")

        # Get or create user
        email = id_claims.get("email", "")
        name = id_claims.get("name") or derive_name_from_email(email)
        user = await auth_service.get_or_create_user(platform_sub=id_claims["sub"], email=email, name=name)

        # Issue application JWT token encapsulating user information
        app_token, expires_at, _ = await auth_service.issue_app_token(
            user=user,
            user_agent=request.headers.get("user-agent"),
            ip_address=_get_request_ip(request),
        )

        fragment = urlencode(
            {
                "token": app_token,
                "expires_at": int(expires_at.timestamp()),
                "token_type": "Bearer",
            }
        )

        redirect_url = f"{backend_url}/auth/callback?{fragment}"
        logger.info("[callback] OIDC callback successful, redirecting to %s", redirect_url)
        redirect_response = RedirectResponse(
            url=redirect_url,
            status_code=status.HTTP_302_FOUND,
        )
        return redirect_response

    except IDTokenValidationError as e:
        # Redirect to error page with validation details
        return redirect_with_error(f"Authentication failed: {e.message}")
    except HTTPException as e:
        # Redirect to error page with the original detail message
        return redirect_with_error(str(e.detail))
    except Exception as e:
        logger.exception(f"Unexpected error in OIDC callback: {e}")
        return redirect_with_error(
            "Authentication processing failed. Please try again or contact support if the issue persists."
        )


@router.post("/token/exchange", response_model=TokenExchangeResponse)
async def exchange_platform_token(
    request: Request,
    payload: PlatformTokenExchangeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange Platform token for app token, restricted to admin user."""
    _enforce_auth_rate_limit(request, "token_exchange")
    logger.info("[token/exchange] Received platform token exchange request")

    verify_url = f"{settings.oidc_issuer_url}/platform/tokens/verify"
    logger.debug(f"[token/exchange] Verifying token with issuer: {verify_url}")

    try:
        async with httpx.AsyncClient() as client:
            verify_response = await client.post(
                verify_url,
                json={"platform_token": payload.platform_token},
                headers={"Content-Type": "application/json"},
            )
        logger.debug(f"[token/exchange] Issuer response status: {verify_response.status_code}")
    except httpx.HTTPError as exc:
        logger.error(f"[token/exchange] HTTP error verifying platform token: {exc}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to verify platform token") from exc

    try:
        verify_body = verify_response.json()
        logger.debug(f"[token/exchange] Issuer response body: {verify_body}")
    except ValueError:
        logger.error(f"[token/exchange] Failed to parse issuer response as JSON: {verify_response.text}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid response from platform token verification service",
        )

    if not isinstance(verify_body, dict):
        logger.error(f"[token/exchange] Unexpected response type: {type(verify_body)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unexpected response from platform token verification service",
        )

    if verify_response.status_code != status.HTTP_200_OK or not verify_body.get("success"):
        message = verify_body.get("message", "") if isinstance(verify_body, dict) else ""
        logger.warning(
            f"[token/exchange] Token verification failed: status={verify_response.status_code}, message={message}"
        )
        raise HTTPException(
            status_code=verify_response.status_code,
            detail=message or "Platform token verification failed",
        )

    payload_data = verify_body.get("data") or {}
    raw_user_id = payload_data.get("user_id")
    logger.info(f"[token/exchange] Token verified, platform_user_id={raw_user_id}, email={payload_data.get('email')}")

    if not raw_user_id:
        logger.error("[token/exchange] Platform token payload missing user_id")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Platform token payload missing user_id")

    platform_user_id = str(raw_user_id)
    if platform_user_id != str(settings.admin_user_id):
        logger.warning(
            f"[token/exchange] Denied: platform_user_id={platform_user_id}, admin_user_id={settings.admin_user_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admin user can exchange a platform token"
        )

    logger.info("[token/exchange] Admin user verified, issuing admin token without DB persistence")
    auth_service = AuthService(db)

    admin_email = payload_data.get("email", "") or getattr(settings, "admin_user_email", "")
    admin_name = payload_data.get("name") or payload_data.get("username")
    if not admin_name:
        admin_name = derive_name_from_email(admin_email)

    user = User(id=platform_user_id, email=admin_email, name=admin_name, role="admin")
    logger.debug(
        f"[token/exchange] Admin user object for token issuance: id={user.id}, email={user.email}, role={user.role}"
    )

    app_token, expires_at, _ = await auth_service.issue_app_token(
        user=user,
        user_agent=request.headers.get("user-agent"),
        ip_address=_get_request_ip(request),
    )
    logger.info(f"[token/exchange] Token issued successfully for user_id={user.id}, expires_at={expires_at}")

    return TokenExchangeResponse(
        token=app_token,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current user info."""
    return current_user


@router.get("/logout", response_model=LogoutResponse)
async def logout(
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    token: str = Depends(get_bearer_token),
    db: AsyncSession = Depends(get_db),
):
    """Logout user."""
    _enforce_auth_rate_limit(request, "logout")
    auth_service = AuthService(db)
    revoked_sessions = 0

    try:
        payload = decode_access_token(token)
        session_id = payload.get("sid")
        if session_id:
            revoked_sessions = await auth_service.revoke_session(str(current_user.id), str(session_id), reason="logout")
        else:
            revoked_sessions = await auth_service.revoke_all_user_sessions(str(current_user.id), reason="legacy_logout")
    except AccessTokenError:
        revoked_sessions = await auth_service.revoke_all_user_sessions(str(current_user.id), reason="fallback_logout")

    logout_url = build_logout_url()
    return LogoutResponse(redirect_url=logout_url, revoked_sessions=revoked_sessions)


@router.post("/logout/all", response_model=LogoutResponse)
async def logout_all_devices(
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Logout user from all devices and revoke all active sessions."""
    _enforce_auth_rate_limit(request, "logout_all")
    auth_service = AuthService(db)
    revoked_sessions = await auth_service.revoke_all_user_sessions(str(current_user.id), reason="logout_all")
    return LogoutResponse(redirect_url=build_logout_url(), revoked_sessions=revoked_sessions)
