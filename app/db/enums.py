"""Domain enumerations shared across every module.

This is the single source of truth for these values. Never redefine one of
these enums inside a module — import it from here so the Python value, the
PostgreSQL type name, and the API representation can never drift apart.

Each enum is a :class:`enum.StrEnum`, so a member *is* its string value: it
serialises to plain ``"owner"`` in JSON, compares equal to ``"owner"``, and
interpolates as ``owner`` rather than ``MembershipRole.OWNER``. Each also gets
a matching native PostgreSQL ``ENUM`` type built by :func:`pg_enum`.

CHANGING AN ENUM IS A MIGRATION, NOT AN EDIT. These are native PostgreSQL enum
types, so editing a class here does nothing to an existing database and
``--autogenerate`` will not notice. Adding a member needs an explicit
``ALTER TYPE <name> ADD VALUE '<value>'``; renaming or removing one needs a
full type rebuild (create new type, ``ALTER TABLE ... USING``, drop old). Add
new members at the end and treat removal as a data migration.
"""

from __future__ import annotations

from enum import Enum, StrEnum

from sqlalchemy import Enum as SAEnum


class MembershipRole(StrEnum):
    """A user's role inside one shop."""

    OWNER = "owner"
    MANAGER = "manager"
    SALESMAN = "salesman"


class MembershipStatus(StrEnum):
    """Lifecycle of a membership. Rows are never deleted, only transitioned."""

    ACTIVE = "active"
    INVITED = "invited"  # invited but not yet accepted
    REMOVED = "removed"  # removed by someone else (Owner/Manager action)
    RESIGNED = "resigned"  # self-initiated departure


class ShopStatus(StrEnum):
    """Lifecycle of a shop.

    Every shop starts PENDING, awaiting superuser review of its submitted
    ShopDocuments. A user may still log in while their shop is PENDING, but
    cannot select it as their active shop (see
    ``users/service.py:switch_active_shop``) until it is ACTIVE.
    """

    PENDING = "pending"  # awaiting superuser approval
    ACTIVE = "active"
    SUSPENDED = "suspended"  # reversible lock
    REJECTED = "rejected"  # approval denied
    REMOVED = "removed"  # soft, longer-term removal


class ShopDocumentType(StrEnum):
    """A document submitted in support of a shop's approval."""

    OWNER_NID = "owner_nid"
    TRADE_LICENSE = "trade_license"
    TIN_CERTIFICATE = "tin_certificate"
    OTHER = "other"


class ProductStatus(StrEnum):
    """Whether a product is still sellable. Products are never hard-deleted."""

    ACTIVE = "active"
    DISCONTINUED = "discontinued"


class InventoryMovementType(StrEnum):
    """Why an inventory batch's remaining_quantity changed."""

    PURCHASE = "purchase"  # batch created / stock received
    SALE = "sale"
    SALE_RETURN = "sale_return"
    PURCHASE_RETURN = "purchase_return"
    ADJUSTMENT = "adjustment"  # manual stock correction


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
SHOP_STATUS_ENUM = pg_enum(ShopStatus, "shop_status")
SHOP_DOCUMENT_TYPE_ENUM = pg_enum(ShopDocumentType, "shop_document_type")
PRODUCT_STATUS_ENUM = pg_enum(ProductStatus, "product_status")
INVENTORY_MOVEMENT_TYPE_ENUM = pg_enum(InventoryMovementType, "inventory_movement_type")
