"""Shop operating expenses and their categories."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.modules.shops.models import Shop


class ExpenseCategory(BaseModel):
    __tablename__ = "expense_categories"
    __table_args__ = (UniqueConstraint("shop_id", "name"),)

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("shops.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    shop: Mapped[Shop] = relationship(back_populates="expense_categories")
    expenses: Mapped[list[ShopExpense]] = relationship(
        back_populates="category", passive_deletes="all"
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<ExpenseCategory id={self.id} name={self.name!r}>"


class ShopExpense(BaseModel):
    __tablename__ = "shop_expenses"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="amount_non_negative"),
        Index("ix_shop_expenses_shop_id_expense_date", "shop_id", "expense_date"),
    )

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("shops.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    expense_category_id: Mapped[int] = mapped_column(
        ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    staff_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    added_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)

    shop: Mapped[Shop] = relationship(back_populates="expenses")
    category: Mapped[ExpenseCategory] = relationship(back_populates="expenses")

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<ShopExpense id={self.id} amount={self.amount}>"
