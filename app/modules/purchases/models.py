"""Purchase returns — stock sent back to a supplier.

Reduces an :class:`~app.modules.inventory.models.InventoryBatch`'s
``remaining_quantity``, recorded via an
:class:`~app.modules.inventory.models.InventoryMovementLog` row rather than by
mutating the batch's original ``quantity``.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.modules.inventory.models import InventoryBatch
    from app.modules.products.models import Product
    from app.modules.shops.models import Shop


class PurchaseReturn(BaseModel):
    __tablename__ = "purchase_returns"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("refund_amount >= 0", name="refund_amount_non_negative"),
        Index("ix_purchase_returns_shop_id_returned_at", "shop_id", "returned_at"),
    )

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("shops.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    inventory_batch_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_batches.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    processed_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    refund_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    returned_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

    shop: Mapped[Shop] = relationship(back_populates="purchase_returns")
    inventory_batch: Mapped[InventoryBatch] = relationship()
    product: Mapped[Product] = relationship()

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<PurchaseReturn id={self.id} inventory_batch_id={self.inventory_batch_id}>"
