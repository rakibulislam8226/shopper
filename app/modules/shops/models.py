"""Shops — the tenant boundary.

Every shop-scoped row in the system carries this table's ``id``. Shops are
never hard-deleted: ``status`` moves to SUSPENDED (reversible lock) or REMOVED
(soft, longer-term), so the financial history underneath stays intact and
auditable.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.db.enums import SHOP_STATUS_ENUM, ShopStatus

if TYPE_CHECKING:
    from app.modules.expenses.models import ExpenseCategory, ShopExpense
    from app.modules.inventory.models import InventoryBatch, InventoryMovementLog
    from app.modules.memberships.models import ShopMembership
    from app.modules.products.models import Product, ProductCategory
    from app.modules.purchases.models import PurchaseReturn
    from app.modules.sales.models import SaleReturn, SaleTransaction


class Shop(BaseModel):
    __tablename__ = "shops"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logo: Mapped[str | None] = mapped_column(String(500), nullable=True)

    status: Mapped[ShopStatus] = mapped_column(
        SHOP_STATUS_ENUM,
        nullable=False,
        default=ShopStatus.ACTIVE,
        server_default=ShopStatus.ACTIVE.value,
        index=True,
    )

    # The user (owner or superuser) who created this shop.
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )

    # passive_deletes="all" on every collection below: without it SQLAlchemy's
    # default delete behaviour is to NULL out the child's shop_id before
    # issuing the parent DELETE, which orphans rows and never lets the
    # database's ondelete="RESTRICT" fire. "all" tells the ORM to touch nothing
    # and let PostgreSQL refuse the delete outright.
    memberships: Mapped[list[ShopMembership]] = relationship(
        back_populates="shop", passive_deletes="all"
    )
    products: Mapped[list[Product]] = relationship(back_populates="shop", passive_deletes="all")
    product_categories: Mapped[list[ProductCategory]] = relationship(
        back_populates="shop", passive_deletes="all"
    )
    inventory_batches: Mapped[list[InventoryBatch]] = relationship(
        back_populates="shop", passive_deletes="all"
    )
    inventory_movement_logs: Mapped[list[InventoryMovementLog]] = relationship(
        back_populates="shop", passive_deletes="all"
    )
    sale_transactions: Mapped[list[SaleTransaction]] = relationship(
        back_populates="shop", passive_deletes="all"
    )
    sale_returns: Mapped[list[SaleReturn]] = relationship(
        back_populates="shop", passive_deletes="all"
    )
    purchase_returns: Mapped[list[PurchaseReturn]] = relationship(
        back_populates="shop", passive_deletes="all"
    )
    expense_categories: Mapped[list[ExpenseCategory]] = relationship(
        back_populates="shop", passive_deletes="all"
    )
    expenses: Mapped[list[ShopExpense]] = relationship(
        back_populates="shop", passive_deletes="all"
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Shop id={self.id} name={self.name!r} status={self.status.value}>"
