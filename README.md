# shopper

Multi-tenant shop / organization management SaaS.

Two independent apps in one repository:

- **backend** — FastAPI (Python), at the project **root** under `app/`.
- **frontend** — React + TypeScript + Vite, self-contained in **`web/`** with
  its own `package.json` and `node_modules`.

They share nothing at the tooling level and run as separate processes. There
are exactly two dependency environments: a Python virtualenv for the backend
and `web/node_modules` for the frontend.

> **Phase 1 — data layer.** The full domain schema exists as SQLAlchemy models
> and one Alembic migration. There is still no business logic (auth, RBAC,
> sales, inventory) and no router beyond `GET /health`.

---

## Layout

```
shopper/
├── app/                     FastAPI backend
│   ├── main.py              app instance, middleware, lifespan (startup checks)
│   ├── config.py            pydantic-settings; assembles DB/Redis URLs in memory
│   ├── core/
│   │   ├── logging.py       structlog structured logging
│   │   ├── security.py      Argon2 password hashing (JWT helpers land in Phase 2)
│   │   └── exceptions.py    custom errors + handlers (consistent error shape)
│   ├── db/
│   │   ├── base.py          DeclarativeBase + naming convention + type map
│   │   ├── enums.py         domain enums (single source of truth)
│   │   ├── mixins.py        UUID PK, created_at/updated_at mixins
│   │   ├── models.py        model registry — imports every model for Alembic
│   │   └── session.py       async engine, session factory, get_db dependency
│   ├── redis/
│   │   └── client.py        redis.asyncio client
│   ├── health/
│   │   └── router.py        GET /health (checks Postgres + Redis)
│   └── modules/             folder-per-feature; Phase 1 ships models.py only
│       ├── superadmins/     SuperAdmin
│       ├── users/           User
│       ├── organizations/   Organization
│       ├── memberships/     Membership (user ↔ organization + role)
│       ├── products/        Product, PriceHistory
│       ├── sales/           Sale
│       └── audit/           AuditLog
├── alembic/                 migrations (env.py reads app settings)
├── alembic.ini
├── tests/                   pytest (health smoke test + schema invariants)
├── pyproject.toml           ruff + mypy + pytest config
├── requirements.txt         pinned production deps
├── requirements-dev.txt     dev-only deps (ruff, mypy, pytest, httpx)
├── web/                     React + Vite frontend (own package.json/node_modules)
├── .env.example
└── README.md
```

---

## Data model (Phase 1)

Eight tables. `Organization` is the tenant boundary: every org-scoped row
carries a NOT NULL, indexed `organization_id`, and every query from Phase 2
onward filters on it.

```
SuperAdmin ──creates──> Organization <──┬── Membership ──> User
 (platform)                             ├── Product ──> PriceHistory
                                        └── Sale ──> Product, User(salesman)
AuditLog ── organization_id (nullable, null = platform-level action)
```

`Membership` is the only place a role lives — `User` itself has no org and no
permissions. There is exactly **one membership row per (user, organization)**
forever: promotions update `role`, departures update `status`. Rows are never
duplicated or deleted.

Rules the schema enforces, not just documents:

| Rule | Mechanism |
|---|---|
| Money is exact | `Numeric(12, 2)` everywhere; `Decimal` in Python, never `float` |
| IDs aren't guessable | UUIDv4 primary keys, never auto-increment integers |
| History can't be destroyed | every FK is `ondelete="RESTRICT"`; no CASCADE anywhere |
| Stock can't go negative | `CHECK (stock_quantity >= 0)` |
| Prices/totals can't go negative | `CHECK` on cost, sale, unit, and total |
| A sale is at least one unit | `CHECK (quantity > 0)` |
| One membership per user per org | `UNIQUE (user_id, organization_id)` |
| SKU unique within an org | `UNIQUE (organization_id, sku)` (NULLs allowed) |
| An invite has one inviter | `CHECK` — user and superadmin columns mutually exclusive |

Historical accuracy comes from two frozen columns on `Sale`:
`unit_price_at_sale` (never updated, so a later price change cannot rewrite
what a customer paid) and `total_amount` (stored, so past totals survive any
future change to calculation logic). `PriceHistory` is a separate audit trail
of price changes over time — reporting never has to replay it.

Nothing is ever hard-deleted. `Organization`, `Membership`, and `Product` all
carry a status enum instead.

> **Changing an enum is a migration, not an edit.** These are native PostgreSQL
> enum types; `--autogenerate` will not notice a new member. See the note at the
> top of `app/db/enums.py`.

---

## Prerequisites

- **Python ≥ 3.13**
- **Node.js ≥ 20.19** (for the frontend)
- **PostgreSQL** and **Redis** running locally (native installs or however you
  already run them). Docker is **not** used right now — it may be reintroduced
  later for containerized dev.

Point the app at your local services via `.env`.

---

## Backend setup

```bash
# 1. Environment
cp .env.example .env                      # edit to match your local Postgres/Redis

# 2. Virtualenv
python -m venv .venv
source .venv/bin/activate                 # Windows: .venv\Scripts\activate

# 3. Dependencies
pip install -r requirements.txt -r requirements-dev.txt

# 4. Migrations — creates the full Phase 1 schema
alembic upgrade head

# 5. Run (dev, auto-reload)
uvicorn app.main:app --reload --port 8000
```

- Health → <http://localhost:8000/health>
- Swagger → <http://localhost:8000/docs> (when `ENABLE_DOCS=true`)
- ReDoc → <http://localhost:8000/redoc>

**Production note:** run under Uvicorn with multiple workers, or Gunicorn with
Uvicorn workers (`gunicorn app.main:app -k uvicorn.workers.UvicornWorker`).
Process management isn't configured in this phase.

---

## Frontend setup

The frontend reads the root `.env` (its `VITE_API_BASE_URL` points at
`http://localhost:8000`).

```bash
cd web
npm install
npm run dev            # http://localhost:5173
```

---

## Configuration

`.env` at the project root is the single source of truth. Postgres and Redis are
configured as **individual fields** (`POSTGRES_HOST/PORT/DB/USER/PASSWORD`,
`REDIS_HOST/PORT/PASSWORD/DB`), never as connection strings. `app/config.py`
assembles `settings.database_url` and `settings.redis_url` in memory from those
fields — Alembic uses the same settings object, so there is one source of
connection truth.

The backend **refuses to start** on missing/invalid config: `pydantic-settings`
validates the environment at import and raises immediately. `.env.example`
documents every key, including ones reserved for later phases.

---

## Development commands

```bash
ruff check .           # lint
ruff format .          # format
mypy app               # type-check
pytest                 # tests
alembic revision --autogenerate -m "..."   # new migration
alembic upgrade head   # apply
alembic downgrade base # full reverse (verified working)
```

**When you add a model,** import it in `app/db/models.py`. Alembic only sees
what is registered there — a model that is missing from it is invisible to
autogenerate, and its table will be dropped by the next migration.

Always read a generated migration before applying it. Autogenerate does not
emit `DROP TYPE` for native enums, so any migration that creates one needs the
teardown added by hand (the initial migration shows the pattern).

---

## Notes

- **Docker** is not part of the current setup; run Postgres and Redis locally.
- **Connection pooling** (production): put PgBouncer in front of Postgres under
  heavy horizontal scaling and point `POSTGRES_HOST/PORT` at it.
- **Docs** are gated by `ENABLE_DOCS` — set it `false` in production to disable
  `/docs`, `/redoc`, and `/openapi.json`.
- Every request gets an `X-Request-ID` (generated if not supplied), bound to
  logs and echoed back on the response.
