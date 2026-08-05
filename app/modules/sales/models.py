"""Sales — the financial ledger.

MONEY RULE — READ BEFORE EDITING: ``unit_price_at_sale`` and ``total_amount``
are ``Numeric(12, 2)`` and are handled as ``decimal.Decimal`` in Python. Do NOT
change them to ``Float``/``float``. Float arithmetic drifts, and these are the
numbers every revenue report is built from.

Two deliberate denormalisations, both of which exist to keep history true:

* ``unit_price_at_sale`` is frozen when the row is created and never updated.
  A later price change on the product must not retroactively rewrite what a
  customer actually paid.
* ``total_amount`` is stored, not recomputed. If discount or tax logic changes
  in a future phase, past totals stay exactly as they were recorded.

Sale rows are immutable after creation apart from the annotation fields.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.modules.organizations.models import Organization
    from app.modules.products.models import Product
    from app.modules.users.models import User


class Sale(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "sales"
    __table_args__ = (
        # A sale of zero or negative units is never a real event; refunds get
        # their own representation rather than a negative quantity.
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price_at_sale >= 0", name="unit_price_at_sale_non_negative"),
        CheckConstraint("total_amount >= 0", name="total_amount_non_negative"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    salesman_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    # MONEY — Numeric, never Float. Both frozen at creation.
    unit_price_at_sale: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Defaults to the insert time, but the column accepts an explicit value so
    # backdated manual entry stays possible (policy decided in Phase 8).
    sold_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

    organization: Mapped[Organization] = relationship(back_populates="sales")
    product: Mapped[Product] = relationship(back_populates="sales")
    salesman: Mapped[User] = relationship(foreign_keys=[salesman_user_id])

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<Sale id={self.id} product_id={self.product_id} "
            f"quantity={self.quantity} total_amount={self.total_amount}>"
        )
