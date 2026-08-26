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
from app.modules.expenses.models import ExpenseCategory, ShopExpense
from app.modules.inventory.models import InventoryBatch, InventoryMovementLog
from app.modules.memberships.models import ShopMembership
from app.modules.products.models import Product, ProductCategory
from app.modules.purchases.models import PurchaseReturn
from app.modules.sales.models import SaleReturn, SaleTransaction
from app.modules.shops.models import Shop
from app.modules.users.models import User

__all__ = [
    "AuditLog",
    "Base",
    "ExpenseCategory",
    "InventoryBatch",
    "InventoryMovementLog",
    "Product",
    "ProductCategory",
    "PurchaseReturn",
    "SaleReturn",
    "SaleTransaction",
    "Shop",
    "ShopExpense",
    "ShopMembership",
    "User",
]
