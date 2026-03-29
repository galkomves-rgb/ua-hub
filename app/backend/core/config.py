import logging
import os
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Application
    app_name: str = "FastAPI Modular Template"
    debug: bool = False
    version: str = "1.0.0"
    app_env: str = "local"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    backend_public_url: str | None = None
    frontend_public_url: str | None = None

    # AWS Lambda Configuration
    is_lambda: bool = False
    lambda_function_name: str = "fastapi-backend"
    aws_region: str = "us-east-1"

    # Integrations
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_jwt_secret: str | None = None
    oss_service_url: str | None = None
    oss_api_key: str | None = None
    geocoding_search_url: str = "https://nominatim.openstreetmap.org/search"
    geocoding_user_agent: str = "UAHUB/1.0"
    geocoding_contact_email: str | None = None
    jwt_secret_key: str | None = None
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    @property
    def is_local(self) -> bool:
        return self.app_env == "local"

    @property
    def is_preview(self) -> bool:
        return self.app_env == "preview"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def backend_url(self) -> str:
        """Generate backend URL from host and port."""
        if self.backend_public_url:
            return self.backend_public_url.rstrip("/")
        if self.is_lambda:
            # In Lambda environment, return the API Gateway URL
            return os.environ.get(
                "PYTHON_BACKEND_URL", f"https://{self.lambda_function_name}.execute-api.{self.aws_region}.amazonaws.com"
            )
        else:
            # Use localhost for external callbacks instead of 0.0.0.0
            display_host = "127.0.0.1" if self.host == "0.0.0.0" else self.host
            return os.environ.get("PYTHON_BACKEND_URL", f"http://{display_host}:{self.port}")

    @property
    def frontend_url(self) -> str:
        return (
            self.frontend_public_url
            or os.environ.get("FRONTEND_URL")
            or os.environ.get("PYTHON_FRONTEND_URL")
            or "/"
        )

    class Config:
        case_sensitive = False
        extra = "ignore"

    @field_validator("debug", mode="before")
    @classmethod
    def normalize_debug(cls, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "dev", "local"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production", ""}:
                return False
        raise ValueError("debug must be a boolean-compatible value")

    def __getattr__(self, name: str) -> Any:
        """
        Dynamically read attributes from environment variables.
        For example: settings.opapi_key reads from OPAPI_KEY environment variable.

        Args:
            name: Attribute name (e.g., 'opapi_key')

        Returns:
            Value from environment variable

        Raises:
            AttributeError: If attribute doesn't exist and not found in environment variables
        """
        # Convert attribute name to environment variable name (snake_case -> UPPER_CASE)
        env_var_name = name.upper()

        # Check if environment variable exists
        if env_var_name in os.environ:
            value = os.environ[env_var_name]
            # Cache the value in instance dict to avoid repeated lookups
            self.__dict__[name] = value
            logger.debug(f"Read dynamic attribute {name} from environment variable {env_var_name}")
            return value

        # If not found, raise AttributeError to maintain normal Python behavior
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")


# Global settings instance
settings = Settings()
