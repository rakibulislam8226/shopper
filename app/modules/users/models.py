"""User accounts — the single identity table for the whole platform.

There is one kind of human record: a ``User``. Access inside an organization
comes only from a :class:`~app.modules.memberships.models.Membership` row — the
user record itself carries no org, no role, and no org permissions.

Platform operators are the one exception: ``is_superadmin`` is a flag on this
table, not a separate identity. It sits *outside* the membership model on
purpose — a superadmin acts across every tenant and belongs to none.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.modules.memberships.models import Membership


class User(BaseModel):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))

    is_superadmin: Mapped[bool] = mapped_column(
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

    last_login_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Organization's collections.
    memberships: Mapped[list[Membership]] = relationship(
        back_populates="user",
        foreign_keys="Membership.user_id",
        passive_deletes="all",
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<User id={self.id} phone={self.phone!r}>"
