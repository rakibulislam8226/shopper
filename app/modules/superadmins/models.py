"""Platform superadmin accounts.

A superadmin is a platform operator, not a tenant user. This table is kept
entirely separate from ``users``: the two identities have different lifecycles,
different auth flows, and different blast radius. Nothing here is ever joined
into an org-scoped query — if a query filters on ``organization_id``, a
superadmin has no business being in it.
"""

from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class SuperAdmin(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "superadmins"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Set on seeded/reset accounts; auth (Phase 2+) forces a rotation before
    # any other action is permitted.
    must_change_password: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<SuperAdmin id={self.id} email={self.email!r}>"
