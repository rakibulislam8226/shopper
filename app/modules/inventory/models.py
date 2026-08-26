"""Inventory batches (FIFO cost lots) and their movement ledger.

MONEY RULE — READ BEFORE EDITING: every cost/price column here is
``Numeric(12, 2)`` and handled as ``decimal.Decimal`` in Python. Never Float.

A purchase creates one :class:`InventoryBatch` at its own unit cost. A sale
consumes ``remaining_quantity`` off the oldest open batch(es) first (FIFO), so
cost of goods sold reflects what that specific stock actually cost — not a
shop-wide average. :class:`InventoryMovementLog` is the append-only ledger of
every quantity change against a batch, written by the same service call that
mutates ``remaining_quantity`` so the two can never drift apart.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.db.enums import INVENTORY_MOVEMENT_TYPE_ENUM, InventoryMovementType

if TYPE_CHECKING:
    from app.modules.products.models import Product
    from app.modules.shops.models import Shop
    from app.modules.users.models import User


class InventoryBatch(BaseModel):
    __tablename__ = "inventory_batches"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="quantity_non_negative"),
        CheckConstraint("remaining_quantity >= 0", name="remaining_quantity_non_negative"),
        CheckConstraint("unit_cost >= 0", name="unit_cost_non_negative"),
        CheckConstraint("carry_cost >= 0", name="carry_cost_non_negative"),
        # FIFO consumption: "oldest open batches for product X in shop Y".
        Index(
            "ix_inventory_batches_shop_id_product_id_purchased_at",
            "shop_id",
            "product_id",
            "purchased_at",
        ),
    )

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("shops.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    # Starts equal to quantity; decremented as sales/returns consume the lot.
    remaining_quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    # Freight/handling/etc. allocated to this lot, on top of unit_cost.
    carry_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=0, server_default="0"
    )
    # Generated, not hand-maintained: (unit_cost * quantity) + carry_cost.
    total_unit_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    # Floor sale price for stock sold out of this specific lot; null defers
    # to Product.min_price.
    min_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    purchased_at: Mapped[date] = mapped_column(Date, nullable=False)

    added_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    shop: Mapped[Shop] = relationship(back_populates="inventory_batches")
    product: Mapped[Product] = relationship(back_populates="inventory_batches")

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<InventoryBatch id={self.id} product_id={self.product_id} "
            f"remaining_quantity={self.remaining_quantity}>"
        )


class InventoryMovementLog(BaseModel):
    """Append-only ledger of every quantity change against a batch.

    Rows are never updated or deleted. ``reference_type``/``reference_id`` are
    a deliberate non-FK — they point at whichever table caused the movement
    (a SaleTransaction, a SaleReturn, a PurchaseReturn, or a manual
    adjustment with no reference row at all).
    """

    __tablename__ = "inventory_movement_logs"
    __table_args__ = (
        Index(
            "ix_inventory_movement_logs_shop_id_product_id_created_at",
            "shop_id",
            "product_id",
            "created_at",
        ),
    )

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("shops.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    inventory_batch_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_batches.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    type: Mapped[InventoryMovementType] = mapped_column(
        INVENTORY_MOVEMENT_TYPE_ENUM, nullable=False, index=True
    )
    # Signed: negative for stock leaving (sale), positive for stock arriving
    # (purchase, sale return).
    quantity_change: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    # remaining_quantity on the batch immediately after this movement —
    # makes the ledger self-auditing without replaying history.
    balance_after: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    reference_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reference_id: Mapped[int | None] = mapped_column(nullable=True)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    shop: Mapped[Shop] = relationship(back_populates="inventory_movement_logs")

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<InventoryMovementLog id={self.id} type={self.type.value} "
            f"quantity_change={self.quantity_change}>"
        )
