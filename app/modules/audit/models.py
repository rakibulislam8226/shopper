"""Audit log — append-only record of who changed what.

Rows are written, never updated or deleted. ``updated_at``/``deleted_at`` are
inherited from :class:`~app.db.base.BaseModel` like every other table but are
never set in practice — nothing in this codebase issues an UPDATE or a soft
delete against ``audit_logs``.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class AuditLog(BaseModel):
    __tablename__ = "audit_logs"
    __table_args__ = (
        # "Show me this shop's history", newest first.
        Index("ix_audit_logs_shop_id_created_at", "shop_id", "created_at"),
        # "Show me this record's history", regardless of shop.
        Index("ix_audit_logs_entity_type_entity_id", "entity_type", "entity_id"),
    )

    # Nullable: platform-level superuser actions belong to no shop.
    shop_id: Mapped[int | None] = mapped_column(
        ForeignKey("shops.id", ondelete="RESTRICT"),
        nullable=True,
    )

    # Every actor is a user now — tenant member or superuser alike — so this
    # is a real, database-validated foreign key rather than the polymorphic
    # id it used to be. Whether the action was platform-level is read from
    # ``shop_id`` being null, not from a separate actor type.
    actor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Dotted action name, e.g. "shop.suspended", "product.price_changed".
    action: Mapped[str] = mapped_column(String(128), nullable=False)

    # Target of the action, e.g. entity_type="Product", entity_id=<product id>.
    # Also a deliberate non-FK: it points at whichever table ``entity_type``
    # names.
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # Snapshots of the changed record. Null where a side does not apply
    # (creation has no before, deletion has no after).
    before_state: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    after_state: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<AuditLog action={self.action!r} entity={self.entity_type}:{self.entity_id} "
            f"actor_user_id={self.actor_user_id}>"
        )
