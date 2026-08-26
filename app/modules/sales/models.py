"""Sales — the financial ledger — and their returns.

MONEY RULE — READ BEFORE EDITING: every price/amount column here is
``Numeric(12, 2)`` and handled as ``decimal.Decimal`` in Python. Do NOT change
them to ``Float``/``float``. Float arithmetic drifts, and these are the
numbers every revenue report is built from.

``unit_price``/``total_amount`` are frozen at creation and never rewritten by
a later product or batch price change — a customer's receipt must stay true.
Sale rows are immutable after creation; refunds are modelled as a separate
:class:`SaleReturn` row against the original sale, never as an edit or delete.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.modules.inventory.models import InventoryBatch
    from app.modules.products.models import Product
    from app.modules.shops.models import Shop
    from app.modules.users.models import User


class SaleTransaction(BaseModel):
    __tablename__ = "sale_transactions"
    __table_args__ = (
        # A sale of zero or negative units is never a real event.
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price >= 0", name="unit_price_non_negative"),
        CheckConstraint("total_amount >= 0", name="total_amount_non_negative"),
        # Every sales report is "shop X between two dates". Without this the
        # planner falls back to the shop_id index and sorts the whole shop's
        # ledger to answer a one-day question.
        Index("ix_sale_transactions_shop_id_sold_at", "shop_id", "sold_at"),
    )

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("shops.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    # The specific FIFO lot this sale drew from. A sale spanning multiple
    # batches is recorded as multiple SaleTransaction rows.
    inventory_batch_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_batches.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    sold_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    # MONEY — Numeric, never Float. Frozen at creation.
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    sold_for: Mapped[str | None] = mapped_column(String(255), nullable=True)

    sold_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

    shop: Mapped[Shop] = relationship(back_populates="sale_transactions")
    product: Mapped[Product] = relationship(back_populates="sale_transactions")
    inventory_batch: Mapped[InventoryBatch] = relationship()
    sold_by: Mapped[User] = relationship(foreign_keys=[sold_by_user_id])
    returns: Mapped[list[SaleReturn]] = relationship(
        back_populates="sale_transaction", passive_deletes="all"
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<SaleTransaction id={self.id} product_id={self.product_id} "
            f"quantity={self.quantity} total_amount={self.total_amount}>"
        )


class SaleReturn(BaseModel):
    """A customer return against a prior :class:`SaleTransaction`.

    Restocks the returned quantity back onto the originating
    :class:`~app.modules.inventory.models.InventoryBatch` — recorded via an
    :class:`~app.modules.inventory.models.InventoryMovementLog` row rather
    than by mutating the sale itself.
    """

    __tablename__ = "sale_returns"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("refund_amount >= 0", name="refund_amount_non_negative"),
        Index("ix_sale_returns_shop_id_returned_at", "shop_id", "returned_at"),
    )

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("shops.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    sale_transaction_id: Mapped[int] = mapped_column(
        ForeignKey("sale_transactions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    inventory_batch_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_batches.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    processed_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    refund_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    returned_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

    shop: Mapped[Shop] = relationship(back_populates="sale_returns")
    sale_transaction: Mapped[SaleTransaction] = relationship(back_populates="returns")

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<SaleReturn id={self.id} sale_transaction_id={self.sale_transaction_id}>"
