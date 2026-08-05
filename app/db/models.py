"""Model registry.

Importing this module registers every ORM class on ``Base.metadata`` and in the
declarative registry. Two things depend on that:

* Alembic autogenerate — a model that is not imported here is invisible to it,
  and its table will be silently dropped from the next migration.
* String-based relationships (``Mapped[list["Product"]]``) — they resolve only
  once every referenced class has been imported.

Add every new model here the moment you create it.
"""

from __future__ import annotations

from app.db.base import Base
from app.modules.audit.models import AuditLog
from app.modules.memberships.models import Membership
from app.modules.organizations.models import Organization
from app.modules.products.models import PriceHistory, Product
from app.modules.sales.models import Sale
from app.modules.superadmins.models import SuperAdmin
from app.modules.users.models import User

__all__ = [
    "AuditLog",
    "Base",
    "Membership",
    "Organization",
    "PriceHistory",
    "Product",
    "Sale",
    "SuperAdmin",
    "User",
]
