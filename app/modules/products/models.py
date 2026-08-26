"""Products and their categories.

MONEY RULE — READ BEFORE EDITING: ``min_price`` and every price column across
the inventory/sales modules are ``Numeric(12, 2)`` and are handled as
``decimal.Decimal`` in Python. Do NOT change them to ``Float``/``float``.
Binary floating point cannot represent 0.10 exactly; summing float prices
drifts, and a drifting cent in a financial ledger is a bug you cannot
reconstruct after the fact.

Products are never hard-deleted — ``is_active`` turns off — because every
historical :class:`~app.modules.sales.models.SaleTransaction` references one.
Cost is tracked per :class:`~app.modules.inventory.models.InventoryBatch`
(FIFO lots), not on the product itself; ``stock_quantity`` here is a
denormalised running total kept in sync by the inventory service.
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.modules.inventory.models import InventoryBatch
    from app.modules.sales.models import SaleTransaction
    from app.modules.shops.models import Shop


class ProductCategory(BaseModel):
    __tablename__ = "product_categories"
    __table_args__ = (UniqueConstraint("shop_id", "name"),)

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("shops.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    shop: Mapped[Shop] = relationship(back_populates="product_categories")
    products: Mapped[list[Product]] = relationship(
        back_populates="category", passive_deletes="all"
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<ProductCategory id={self.id} name={self.name!r}>"


class Product(BaseModel):
    __tablename__ = "products"
    __table_args__ = (
        # SKU is unique within a shop, not globally. PostgreSQL treats NULLs
        # as distinct in a unique constraint, so any number of products may
        # have no SKU — which is exactly the "unique per shop when set" rule.
        UniqueConstraint("shop_id", "sku"),
        CheckConstraint("stock_quantity >= 0", name="stock_quantity_non_negative"),
        CheckConstraint("min_price >= 0", name="min_price_non_negative"),
        # The catalogue list is always "active products in shop X"; the two
        # single-column indexes cannot serve that as well as one composite.
        Index("ix_products_shop_id_is_active", "shop_id", "is_active"),
    )

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("shops.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("product_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(64), nullable=True)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Denormalised running total, kept in sync with the sum of
    # InventoryBatch.remaining_quantity by the inventory service.
    stock_quantity: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=0, server_default="0"
    )
    # Floor sale price; null means no floor is enforced. Actual sale price is
    # set per InventoryBatch (cost-plus-margin can vary lot to lot).
    min_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true", index=True
    )

    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    shop: Mapped[Shop] = relationship(back_populates="products")
    category: Mapped[ProductCategory | None] = relationship(back_populates="products")
    # passive_deletes="all" — never let the ORM null out a child's product_id
    # to make a parent delete succeed; the DB's RESTRICT must win.
    inventory_batches: Mapped[list[InventoryBatch]] = relationship(
        back_populates="product", passive_deletes="all"
    )
    sale_transactions: Mapped[list[SaleTransaction]] = relationship(
        back_populates="product", passive_deletes="all"
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Product id={self.id} name={self.name!r} sku={self.sku!r}>"
