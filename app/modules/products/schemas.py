"""Request/response schemas for the products module."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.enums import MembershipRole


class ProductCategoryPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uid: UUID
    name: str


class CreateCategoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class CategoriesListResponse(BaseModel):
    categories: list[ProductCategoryPublic]


class ProductPublic(BaseModel):
    uid: UUID
    name: str
    sku: str | None
    unit: str
    description: str | None
    image: str | None
    category: ProductCategoryPublic | None
    stock_quantity: Decimal
    min_price: Decimal | None
    is_active: bool
    created_at: datetime


class CreateProductRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    sku: str | None = Field(default=None, max_length=64)
    unit: str = Field(min_length=1, max_length=32)
    description: str | None = Field(default=None, max_length=2000)
    min_price: Decimal | None = Field(default=None, ge=0)
    category_uid: UUID | None = None


class UpdateProductRequest(BaseModel):
    """Every field is optional — only what's sent (``model_fields_set``) changes.

    ``category_uid: null`` clears the category; omitting the field leaves it
    as-is — the two are told apart via ``model_fields_set``, not the value.
    """

    name: str | None = Field(default=None, min_length=1, max_length=255)
    sku: str | None = Field(default=None, max_length=64)
    unit: str | None = Field(default=None, min_length=1, max_length=32)
    description: str | None = Field(default=None, max_length=2000)
    min_price: Decimal | None = Field(default=None, ge=0)
    category_uid: UUID | None = None


class ProductsListResponse(BaseModel):
    products: list[ProductPublic]
    viewer_role: MembershipRole
