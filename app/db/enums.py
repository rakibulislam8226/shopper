"""Domain enumerations shared across every module.

This is the single source of truth for these values. Never redefine one of
these enums inside a module — import it from here so the Python value, the
PostgreSQL type name, and the API representation can never drift apart.

Each enum is a :class:`enum.StrEnum`, so a member *is* its string value: it
serialises to plain ``"owner"`` in JSON, compares equal to ``"owner"``, and
interpolates as ``owner`` rather than ``MembershipRole.OWNER``. Each also gets
a matching native PostgreSQL ``ENUM`` type built by :func:`pg_enum`.
"""

from __future__ import annotations

from enum import Enum, StrEnum

from sqlalchemy import Enum as SAEnum


class MembershipRole(StrEnum):
    """A user's role inside one organization."""

    OWNER = "owner"
    MANAGER = "manager"
    SALESMAN = "salesman"


class MembershipStatus(StrEnum):
    """Lifecycle of a membership. Rows are never deleted, only transitioned."""

    ACTIVE = "active"
    REMOVED = "removed"  # removed by someone else (Owner/Manager action)
    RESIGNED = "resigned"  # self-initiated departure


class OrganizationStatus(StrEnum):
    """Lifecycle of an organization. Both non-active states are reversible."""

    ACTIVE = "active"
    SUSPENDED = "suspended"  # reversible lock
    REMOVED = "removed"  # soft, longer-term removal


class ProductStatus(StrEnum):
    """Whether a product is still sellable. Products are never hard-deleted."""

    ACTIVE = "active"
    DISCONTINUED = "discontinued"


class ActorType(StrEnum):
    """Which table an ``AuditLog.actor_id`` points at."""

    SUPERADMIN = "superadmin"
    USER = "user"


def _enum_values(enum_cls: type[Enum]) -> list[str]:
    """Persist the enum *values* ("owner"), not the member names ("OWNER")."""
    return [str(member.value) for member in enum_cls]


def pg_enum(enum_cls: type[Enum], name: str) -> SAEnum:
    """Build a native PostgreSQL ``ENUM`` column type for ``enum_cls``.

    ``name`` becomes the PostgreSQL type name and must be stable — renaming it
    later is a migration, not an edit.
    """
    return SAEnum(
        enum_cls,
        name=name,
        native_enum=True,
        values_callable=_enum_values,
        validate_strings=True,
    )


# Reusable column types. Declared once so every table referencing an enum
# points at the same PostgreSQL type.
MEMBERSHIP_ROLE_ENUM = pg_enum(MembershipRole, "membership_role")
MEMBERSHIP_STATUS_ENUM = pg_enum(MembershipStatus, "membership_status")
ORGANIZATION_STATUS_ENUM = pg_enum(OrganizationStatus, "organization_status")
PRODUCT_STATUS_ENUM = pg_enum(ProductStatus, "product_status")
ACTOR_TYPE_ENUM = pg_enum(ActorType, "actor_type")
