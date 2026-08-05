"""Typed application settings.

Loaded and validated once at import time via ``pydantic-settings``. Missing or
invalid environment variables raise ``ValidationError`` immediately, so the app
fails fast instead of limping into a broken runtime state.

Connection strings for Postgres and Redis are never stored as single values in
the environment — they are assembled here, in memory, from the individual
fields (host/port/db/user/password).
"""

from __future__ import annotations

from functools import cached_property
from typing import Literal
from urllib.parse import quote

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- App ----
    app_env: Literal["development", "test", "production"] = "development"
    api_port: int = 8000
    api_base_url: str
    web_base_url: str
    enable_docs: bool = True
    cors_allowed_origins: str = "http://localhost:5173"

    # ---- Database (Postgres) — individual fields, source of truth ----
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str
    postgres_user: str
    postgres_password: str

    # ---- Redis — individual fields, source of truth ----
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0

    # ---- Auth (wired in Phase 2) ----
    jwt_access_secret: str
    jwt_refresh_secret: str
    jwt_access_expires_minutes: int = 15
    jwt_refresh_expires_days: int = 7

    # ---- Media storage ----
    media_storage_driver: Literal["local", "s3"] = "local"
    media_local_upload_dir: str = "./uploads"
    media_local_base_url: str = "http://localhost:8000/uploads"
    aws_s3_bucket: str = ""
    aws_s3_region: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_base_url: str = ""

    # ---- Rate limiting (wired in later phases) ----
    rate_limit_times: int = 20
    rate_limit_seconds: int = 60

    # ---- Logging ----
    log_level: str = Field(default="info")

    @cached_property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    @cached_property
    def database_url(self) -> str:
        """Async SQLAlchemy URL (asyncpg driver), assembled in memory."""
        user = quote(self.postgres_user, safe="")
        password = quote(self.postgres_password, safe="")
        return (
            f"postgresql+asyncpg://{user}:{password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @cached_property
    def redis_url(self) -> str:
        """Redis URL assembled in memory from the individual fields."""
        auth = f":{quote(self.redis_password, safe='')}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @property
    def docs_url(self) -> str | None:
        return "/docs" if self.enable_docs else None

    @property
    def redoc_url(self) -> str | None:
        return "/redoc" if self.enable_docs else None

    @property
    def openapi_url(self) -> str | None:
        return "/openapi.json" if self.enable_docs else None


settings = Settings()
"""Process-wide settings singleton (values come from the environment). Import
this, not the class."""
