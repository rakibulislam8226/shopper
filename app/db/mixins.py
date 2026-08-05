"""Column mixins shared by every model.

Keeping identity and timestamp columns here means a table can never
accidentally ship with an auto-increment key or an untracked mutation time.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column


class UUIDPrimaryKeyMixin:
    """UUIDv4 primary key.

    Deliberately not an auto-increment integer: IDs in a multi-tenant system
    end up in URLs and API payloads, and sequential integers leak row counts
    and let a client enumerate other tenants' records by guessing.
    """

    # sort_order pulls the key ahead of the subclass's own columns; without it
    # mixin columns are appended and every table reads id-last.
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4, sort_order=-100)


class CreatedAtMixin:
    """Insert timestamp only — for append-only tables that are never updated."""

    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
        sort_order=100,
    )


class TimestampMixin(CreatedAtMixin):
    """Insert + last-mutation timestamps, both set by the database clock."""

    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        sort_order=101,
    )
