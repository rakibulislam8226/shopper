"""Tenant user accounts.

A ``User`` is a single global identity. It gains access to an organization only
through a :class:`~app.modules.memberships.models.Membership` row — the user
record itself carries no org, no role, and no permissions.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.modules.memberships.models import Membership


class User(BaseModel):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))

    # Set on invited/reset accounts; auth (Phase 2+) forces a rotation before
    # any other action is permitted.
    must_change_password: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    # Organization's collections.
    memberships: Mapped[list[Membership]] = relationship(
        back_populates="user",
        foreign_keys="Membership.user_id",
        passive_deletes="all",
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<User id={self.id} phone={self.phone!r}>"