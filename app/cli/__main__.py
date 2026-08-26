"""Run every seed command in sequence.

    python -m app.cli                  # seed superadmin, then the demo owner/shop
    python -m app.cli --force          # reset both if they already exist

Thin wrapper around ``app.cli.superadmin`` and ``app.cli.seed_shop`` — each
stays runnable on its own with its own flags; this just chains their defaults
for the common "set up a fresh dev database" case.
"""

from __future__ import annotations

import asyncio
import sys

from app.cli.seed_shop import (
    DEFAULT_NAME as SHOP_OWNER_NAME,
    DEFAULT_PASSWORD as SHOP_OWNER_PASSWORD,
    DEFAULT_PHONE as SHOP_OWNER_PHONE,
    DEFAULT_SHOP_NAME,
    seed_owner_shop,
)
from app.cli.superadmin import DEFAULT_NAME, DEFAULT_PASSWORD, DEFAULT_PHONE, seed_superadmin
from app.db.session import engine


async def run(force: bool) -> int:
    try:
        exit_code = await seed_superadmin(DEFAULT_PHONE, DEFAULT_PASSWORD, DEFAULT_NAME, force)
        if exit_code != 0:
            return exit_code

        return await seed_owner_shop(
            SHOP_OWNER_PHONE, SHOP_OWNER_PASSWORD, SHOP_OWNER_NAME, DEFAULT_SHOP_NAME, force
        )
    finally:
        await engine.dispose()


def main() -> int:
    force = "--force" in sys.argv[1:]
    return asyncio.run(run(force))


if __name__ == "__main__":
    sys.exit(main())
