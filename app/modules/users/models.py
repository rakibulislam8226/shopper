"""User accounts — the single identity table for the whole platform.

There is one kind of human record: a ``User``. Access inside a shop comes only
from a :class:`~app.modules.memberships.models.ShopMembership` row — the user
record itself carries no shop, no role, and no shop permissions.

Platform operators are the one exception: ``is_superuser`` is a flag on this
table, not a separate identity. It sits *outside* the membership model on
purpose — a superuser acts across every tenant and belongs to none.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.modules.memberships.models import ShopMembership

if TYPE_CHECKING:
    from app.modules.shops.models import Shop


class User(BaseModel):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))

    is_superuser: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        index=True,
    )

    must_change_password: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    # The shop last selected in the UI; convenience default for the next
    # login. Null before first selection or if that shop was later removed.
    last_active_shop_id: Mapped[int | None] = mapped_column(
        ForeignKey("shops.id", ondelete="SET NULL"),
        nullable=True,
    )

    last_login_at: Mapped[datetime | None] = mapped_column(nullable=True)

    last_active_shop: Mapped[Shop | None] = relationship(foreign_keys=[last_active_shop_id])
    memberships: Mapped[list[ShopMembership]] = relationship(
        back_populates="user",
        foreign_keys="ShopMembership.user_id",
        passive_deletes="all",
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<User id={self.id} phone={self.phone!r}>"
