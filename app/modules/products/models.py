"""Products and their price audit trail.

MONEY RULE — READ BEFORE EDITING: ``cost_price``, ``sale_price`` and every
column in :class:`PriceHistory` are ``Numeric(12, 2)`` and are handled as
``decimal.Decimal`` in Python. Do NOT change them to ``Float``/``float``.
Binary floating point cannot represent 0.10 exactly; summing float prices
drifts, and a drifting cent in a financial ledger is a bug you cannot
reconstruct after the fact.

Products are never hard-deleted — ``status`` moves to DISCONTINUED — because
every historical :class:`~app.modules.sales.models.Sale` references one.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums import PRODUCT_STATUS_ENUM, ProductStatus
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.modules.organizations.models import Organization
    from app.modules.sales.models import Sale


class Product(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        # SKU is unique within an org, not globally. PostgreSQL treats NULLs as
        # distinct in a unique constraint, so any number of products may have
        # no SKU — which is exactly the "unique per org when set" rule.
        UniqueConstraint("organization_id", "sku"),
        # Defence in depth. Service logic checks stock before every sale, but a
        # single bad code path must never be able to persist negative stock or
        # a negative price — the database refuses the write outright.
        CheckConstraint("stock_quantity >= 0", name="stock_quantity_non_negative"),
        CheckConstraint("cost_price >= 0", name="cost_price_non_negative"),
        CheckConstraint("sale_price >= 0", name="sale_price_non_negative"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)

    # MONEY — Numeric, never Float.
    cost_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    sale_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    stock_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    # Null means "no low-stock alerting for this product".
    low_stock_threshold: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[ProductStatus] = mapped_column(
        PRODUCT_STATUS_ENUM,
        nullable=False,
        default=ProductStatus.ACTIVE,
        server_default=ProductStatus.ACTIVE.value,
        index=True,
    )

    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )

    organization: Mapped[Organization] = relationship(back_populates="products")
    # passive_deletes="all" — never let the ORM null out a child's product_id
    # to make a parent delete succeed; the DB's RESTRICT must win. See the note
    # on Organization's collections.
    price_history: Mapped[list[PriceHistory]] = relationship(
        back_populates="product",
        order_by="PriceHistory.changed_at",
        passive_deletes="all",
    )
    sales: Mapped[list[Sale]] = relationship(
        back_populates="product",
        passive_deletes="all",
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Product id={self.id} name={self.name!r} sku={self.sku!r}>"


class PriceHistory(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Append-only record of every cost/sale price change on a product.

    Service logic (later phases) writes one row here *before* mutating
    ``Product.cost_price`` / ``Product.sale_price``. Rows are never updated or
    deleted.

    This is an audit trail for "how did this product's pricing evolve", read by
    Owners. It is deliberately *not* what protects historical revenue —
    :class:`~app.modules.sales.models.Sale` freezes its own
    ``unit_price_at_sale``, so reporting never has to replay this table to work
    out what something sold for.

    MONEY RULE: all four price columns are ``Numeric(12, 2)``. Never Float.
    """

    __tablename__ = "price_history"

    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # "old" is null for the first record after creation; "new" is always set.
    old_cost_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    new_cost_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    old_sale_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    new_sale_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    changed_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Business event time (may be supplied explicitly), distinct from the
    # row's ``created_at`` insert time.
    changed_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

    product: Mapped[Product] = relationship(back_populates="price_history")

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<PriceHistory product_id={self.product_id} changed_at={self.changed_at}>"
