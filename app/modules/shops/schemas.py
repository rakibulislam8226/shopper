"""Request/response schemas for the shops module."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.db.enums import ShopDocumentType, ShopStatus
from app.modules.users.schemas import TokenPair, UserPublic


class ShopRegisterRequest(BaseModel):
    """Form fields for `POST /api/shops/register` — owner + shop + documents,
    submitted together as one `multipart/form-data` request (the owner NID
    file rides alongside these as a separate `UploadFile` parameter, not a
    field on this model — Pydantic models don't carry file parts themselves).

    If ``phone`` already belongs to an existing user, ``password`` must match
    that account and the new shop is attached to it as an additional
    ownership rather than creating a second user. Tokens are issued right
    away — the shop itself starts PENDING and stays unusable (see
    `POST /api/users/active-shop`) until a superuser approves it.

    The owner NID is required at the *application* layer (this endpoint
    rejects a request without one) but every `shop_documents` row and column
    stays nullable in the schema — "required" is a form rule, not a data
    constraint, so it can change without a migration.
    """

    owner_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=3, max_length=32, examples=["+8801700000000"])
    password: str = Field(min_length=8, max_length=128, examples=["S3cret!pass"])
    confirm_password: str = Field(min_length=8, max_length=128, examples=["S3cret!pass"])

    shop_name: str = Field(min_length=1, max_length=255)
    shop_email: str | None = Field(default=None, max_length=255)
    shop_phone: str | None = Field(default=None, max_length=32)
    shop_address: str | None = Field(default=None, max_length=500)
    shop_logo: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _passwords_must_match(self) -> ShopRegisterRequest:
        if self.password != self.confirm_password:
            raise ValueError("Password and confirm password do not match")
        return self


class ShopPublic(BaseModel):
    """Shop fields safe to expose to a client."""

    model_config = ConfigDict(from_attributes=True)

    uid: UUID
    name: str
    slug: str
    email: str | None
    phone: str | None
    address: str | None
    logo: str | None
    status: ShopStatus
    created_at: datetime


class ShopDocumentPublic(BaseModel):
    """Shop document fields safe to expose to a client."""

    model_config = ConfigDict(from_attributes=True)

    uid: UUID
    type: ShopDocumentType
    file_url: str
    created_at: datetime


class ShopRegisterResponse(BaseModel):
    """Payload placed in the standard envelope's `data` field on registration."""

    user: UserPublic
    shop: ShopPublic
    tokens: TokenPair
    documents: list[ShopDocumentPublic]


class ShopDetailResponse(BaseModel):
    """Payload for `GET /api/shops/{shop_uid}` — profile plus its documents,
    for the Settings screen. Owner-only (see `require_shop_owner`).
    """

    shop: ShopPublic
    documents: list[ShopDocumentPublic]


class ShopUpdateRequest(BaseModel):
    """Body for `PATCH /api/shops/{shop_uid}`.

    Every field is optional — only what's sent is changed. Absent from the
    body (Python ``None``, not JSON ``null``) means "leave as is"; there is
    currently no way to clear ``email``/``phone``/``address``/``logo`` back
    to null through this endpoint, since the two meanings of "no value" would
    otherwise collide on an ordinary optional field.
    """

    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=500)
    logo: str | None = Field(default=None, max_length=500)


# UserPublic.active_shop is a forward reference ("ShopPublic | None") to break
# the users<->shops import cycle; rebuild it now that ShopPublic exists here.
UserPublic.model_rebuild()
