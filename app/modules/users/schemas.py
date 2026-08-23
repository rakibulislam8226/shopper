"""Request/response schemas for the users module."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    """Credentials for `POST /api/users/login`."""

    phone: str = Field(min_length=3, max_length=32, examples=["+8801700000000"])
    password: str = Field(min_length=1, max_length=128, examples=["S3cret!pass"])


class UserPublic(BaseModel):
    """User fields safe to expose to a client. Never carries `password_hash`."""

    model_config = ConfigDict(from_attributes=True)

    uid: UUID
    name: str
    phone: str
    is_superadmin: bool
    is_active: bool
    must_change_password: bool
    last_login_at: datetime | None
    created_at: datetime


class TokenPair(BaseModel):
    """Access + refresh tokens issued on a successful login."""

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    # Seconds until the *access* token expires; the refresh token lives longer.
    expires_in: int


class LoginResponse(BaseModel):
    """Payload placed in the standard envelope's `data` field on login."""

    user: UserPublic
    tokens: TokenPair
