"""Request/response schemas for the shops module."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.enums import ShopDocumentType, ShopStatus
from app.modules.users.schemas import TokenPair, UserPublic


class ShopRegisterRequest(BaseModel):
    """Body for `POST /api/shops/register` — owner + shop, created together.

    If ``phone`` already belongs to an existing user, ``password`` must match
    that account and the new shop is attached to it as an additional
    ownership rather than creating a second user. Tokens are issued right
    away — the shop itself starts PENDING and stays unusable (see
    `POST /api/users/active-shop`) until a superuser approves the documents
    submitted for it (`POST /api/shops/{shop_uid}/documents`).
    """

    owner_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=3, max_length=32, examples=["+8801700000000"])
    password: str = Field(min_length=8, max_length=128, examples=["S3cret!pass"])

    shop_name: str = Field(min_length=1, max_length=255)
    shop_email: str | None = Field(default=None, max_length=255)
    shop_phone: str | None = Field(default=None, max_length=32)
    shop_address: str | None = Field(default=None, max_length=500)
    shop_logo: str | None = Field(default=None, max_length=500)


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


class ShopRegisterResponse(BaseModel):
    """Payload placed in the standard envelope's `data` field on registration."""

    user: UserPublic
    shop: ShopPublic
    tokens: TokenPair


class ShopDocumentPublic(BaseModel):
    """Shop document fields safe to expose to a client."""

    model_config = ConfigDict(from_attributes=True)

    uid: UUID
    type: ShopDocumentType
    file_url: str
    created_at: datetime


# UserPublic.active_shop is a forward reference ("ShopPublic | None") to break
# the users<->shops import cycle; rebuild it now that ShopPublic exists here.
UserPublic.model_rebuild()
