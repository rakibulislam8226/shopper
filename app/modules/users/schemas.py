"""Request/response schemas for the users module."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

if TYPE_CHECKING:
    from app.modules.shops.schemas import ShopPublic


class LoginRequest(BaseModel):
    """Credentials for `POST /api/users/login`."""

    phone: str = Field(min_length=3, max_length=32, examples=["+8801700000000"])
    password: str = Field(min_length=1, max_length=128, examples=["S3cret!pass"])


class RefreshRequest(BaseModel):
    """Body for `POST /api/users/refresh`."""

    refresh_token: str = Field(min_length=1)


class UserPublic(BaseModel):
    """User fields safe to expose to a client. Never carries `password_hash`.

    Carries the *public* shop object, not ``last_active_shop_id`` — the
    latter is an internal integer FK and never crosses the API boundary (see
    every other ``*Public`` schema's use of ``uid``).
    """

    model_config = ConfigDict(from_attributes=True)

    uid: UUID
    name: str
    phone: str
    is_superuser: bool
    is_active: bool
    must_change_password: bool
    active_shop: ShopPublic | None = None
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


class RefreshResponse(BaseModel):
    """Payload placed in the standard envelope's `data` field on refresh."""

    tokens: TokenPair


class SwitchActiveShopRequest(BaseModel):
    """Body for `POST /api/users/active-shop`."""

    shop_uid: UUID


class SwitchActiveShopResponse(BaseModel):
    """Payload placed in the standard envelope's `data` field on shop switch."""

    user: UserPublic


class ForgotPasswordRequest(BaseModel):
    """Body for `POST /api/users/forgot-password`."""

    phone: str = Field(min_length=3, max_length=32, examples=["+8801700000000"])


class VerifyResetOtpRequest(BaseModel):
    """Body for `POST /api/users/verify-reset-otp`."""

    phone: str = Field(min_length=3, max_length=32)
    code: str = Field(min_length=4, max_length=8)


class VerifyResetOtpResponse(BaseModel):
    """Payload placed in the standard envelope's `data` field on OTP success.

    ``reset_token`` proves phone ownership for the *next* call only — it is
    not an access token and grants no API access beyond `reset-password`.
    """

    reset_token: str
    expires_in: int


class ResetPasswordRequest(BaseModel):
    """Body for `POST /api/users/reset-password`."""

    reset_token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128, examples=["N3wSecret!"])
    confirm_password: str = Field(min_length=8, max_length=128, examples=["N3wSecret!"])

    @model_validator(mode="after")
    def _passwords_must_match(self) -> ResetPasswordRequest:
        if self.new_password != self.confirm_password:
            raise ValueError("Password and confirm password do not match")
        return self
