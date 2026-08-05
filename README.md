# shopper

Multi-tenant shop / organization management SaaS.

Two independent apps in one repository:

- **backend** — FastAPI (Python), at the project **root** under `app/`.
- **frontend** — React + TypeScript + Vite, self-contained in **`web/`** with
  its own `package.json` and `node_modules`.

They share nothing at the tooling level and run as separate processes. There
are exactly two dependency environments: a Python virtualenv for the backend
and `web/node_modules` for the frontend.

> **Phase 0 — infrastructure only.** No business logic (auth, RBAC, sales,
> inventory) yet. The one live endpoint is `GET /health`.

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
│   │   ├── base.py          SQLAlchemy DeclarativeBase
│   │   └── session.py       async engine, session factory, get_db dependency
│   ├── redis/
│   │   └── client.py        redis.asyncio client
│   ├── health/
│   │   └── router.py        GET /health (checks Postgres + Redis)
│   └── modules/             empty — folder-per-feature convention for Phase 1+
├── alembic/                 migrations (env.py reads app settings)
├── alembic.ini
├── tests/                   pytest (trivial health smoke test for now)
├── pyproject.toml           ruff + mypy + pytest config
├── requirements.txt         pinned production deps
├── requirements-dev.txt     dev-only deps (ruff, mypy, pytest, httpx)
├── web/                     React + Vite frontend (own package.json/node_modules)
├── .env.example
└── README.md
```

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

# 4. Migrations (safe to run with zero models — it's a clean no-op in Phase 0)
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
alembic revision --autogenerate -m "..."   # (Phase 1+, once models exist)
```

---

## Notes

- **Docker** is not part of the current setup; run Postgres and Redis locally.
- **Connection pooling** (production): put PgBouncer in front of Postgres under
  heavy horizontal scaling and point `POSTGRES_HOST/PORT` at it.
- **Docs** are gated by `ENABLE_DOCS` — set it `false` in production to disable
  `/docs`, `/redoc`, and `/openapi.json`.
- Every request gets an `X-Request-ID` (generated if not supplied), bound to
  logs and echoed back on the response.
