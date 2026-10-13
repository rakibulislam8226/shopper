# Shopper — Feature Status

A multi-tenant shop-management SaaS. Backend: FastAPI + SQLAlchemy(async) + PostgreSQL + Redis. Frontend: React 19 + Vite + TypeScript, served from the same origin as the API.

_Last reviewed: 2026-10-13. Supersedes the "Phase 2" status in README.md, which is stale (describes 7 tables / RBAC as future work; actual DB has 14 tables and employee management is already live)._

## ✅ Done

### Auth
- Phone + password login, JWT access/refresh tokens, Argon2 hashing
- Forgot password via OTP (phone → OTP → reset), active-shop (tenant) switching
- Frontend: sign in/up forms, route guards (`RequireAuth`/`RedirectAuthenticated`), token refresh

### Shop onboarding & profile
- Shop registration with required NID + optional logo/trade license/TIN docs (multipart)
- Shop profile view/edit, logo upload, additional document upload
- Shop lifecycle enum (PENDING → ACTIVE/SUSPENDED/REJECTED/REMOVED)

### Employee / membership management
- Add employee (owner adds manager or salesman; manager adds salesman only)
- List employees: search (debounced, DB-level), role filter, pagination, per-member lifetime sales total
- Edit role (promote/demote manager ↔ salesman) and remove/deactivate — owner-only for anything touching a manager; the owner itself can't be targeted, nor can you act on yourself
- Frontend: table + modal with field-level validation, inline "Change role" / "Remove" actions gated by viewer role

### Platform-admin interface (superuser)
- A separate top-level interface at `/admin`, with its own sidebar (Overview / Organizations / Users) — not a section bolted onto the shop dashboard, since a superuser has no tenant
- **Unlisted login**: the public `/login` form refuses a superuser account (generic "invalid credentials", same as a wrong password); a superuser instead signs in at an unpublished URL known only out of band (`web/src/router/admin/router.tsx`'s `ADMIN_LOGIN_PATH`, deliberately kept off the shared `ROUTES` table). This is obscurity for a cleaner UX split, not the actual access control — see Security below.
- **Organizations**: review queue (`GET /api/admin/shops`, filter by status, search shop/owner, paginated), full lifecycle control (approve / reject with a reason / suspend / reactivate / remove), and a read-only staff list per shop (`GET /api/admin/shops/{uid}/members` — a superuser needs no membership of their own to see it)
- **Users**: platform-wide account list (search, paginated) with activate/deactivate; a superuser can't deactivate their own account
- **Overview**: shop counts by status, total users, total superusers (`GET /api/admin/stats`)
- Security: every `/api/admin/*` route depends on `get_current_superuser`, which re-reads `is_superuser` from the database on every request via the JWT's user id — the token itself carries no role claim. Tampering with client-side state (devtools, localStorage: the stored `isSuperuser` flag, or which login form was used) only changes what renders locally; it grants no API access, since the server never trusts it. The frontend's `RequireSuperuser` guard and the hidden login URL are both UX only, same caveat as `RequireAuth`.

### Platform / UX
- Unified API response envelope + pagination + error handling
- Rate limiting (login, OTP, document upload)
- Single-origin SPA serving (dev proxies Vite, prod serves `web/dist`)
- Dashboard shell: sidebar nav, light/dark/system theme
- Honest empty states — unbuilt pages show "not built yet" placeholders instead of mock data

## 🚧 Partial / Stubbed

| Area | What's missing |
|---|---|
| OTP delivery | No real SMS provider wired — codes are just logged (`app/core/otp.py`) |
| File storage | Only local disk driver works; non-local (e.g. S3) raises `NotImplementedError` |
| Employee management | Edit role / remove are done. No resend-invite — there's no invite-by-link flow at all yet (accounts are created directly with a password set by the adder) |
| Superadmin | Shop review/approve/reject is done; granting `is_superuser` itself is still CLI-only (`app/cli/superadmin.py`), no web UI to promote another admin |

## ❌ Not Started (schema exists, no API/UI)

These have SQLAlchemy models + Alembic migrations but **no router/service/schemas**, and their frontend pages are intentional placeholders tagged "Soon" in the sidebar:

- **Products** (`product_categories`, `products`)
- **Inventory** (`inventory_batches`, `inventory_movement_logs`) — FIFO costing designed but unimplemented
- **Purchases** (`purchase_returns`)
- **Sales** (`sale_transactions`, `sale_returns`)
- **Expenses** (`expense_categories`, `shop_expenses`)
- **Audit log** (`audit_logs`)
- **Organizations / multi-shop admin** — a user can belong to multiple shops at the DB level, but there's no UI to manage/switch across them beyond the single active-shop pointer

Dashboard overview metrics (today's sales, revenue, low stock, active staff) render `—` pending these APIs.

## Next Up (suggested priority)

1. **Products API + UI** — unblocks inventory and sales, and is the next logical dependency for everything else in commerce.
2. **Inventory** (stock in/out, FIFO batches) — depends on Products.
3. **Sales** (transactions + returns) — depends on Products + Inventory; also lets Overview show real numbers.
4. **Real OTP/SMS provider** — replace the logging stand-in before any external users rely on password reset.
5. Purchases, Expenses, Audit log, multi-shop org admin — lower priority, can follow once core commerce is live.

## Tests
Backend only: schema/constraint tests (`tests/test_models_schema.py`), response envelope tests (`tests/test_response.py`). No frontend tests, no e2e/integration tests.
