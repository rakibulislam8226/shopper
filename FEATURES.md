# Shopper — Task List

✅ = Done &nbsp;&nbsp; ⏳ = Pending (business-needed or recommended)

_Last updated: 2026-10-15._

## Auth
- ✅ Phone + password login, JWT access/refresh tokens
- ✅ Forgot password via OTP (phone → OTP → reset)
- ⏳ Real SMS provider — OTP codes are currently just logged, not sent (`app/core/otp.py`)

## Shop (Organization) onboarding
- ✅ Shop registration with NID + optional logo/trade license/TIN documents
- ✅ Shop profile view/edit, logo upload, document upload
- ✅ Shop lifecycle: PENDING → ACTIVE/SUSPENDED/REJECTED/REMOVED
- ✅ Dashboard locked for owner/manager/staff until shop is ACTIVE ("contact admin" notice shown instead)
- ⏳ Multi-shop switch UI — a user can belong to more than one shop in the database, but there's no screen to switch between them

## Employees (staff management)
- ✅ Add employee (owner adds manager/staff; manager adds staff only)
- ✅ List, search, filter by role, pagination, per-staff lifetime sales
- ✅ Edit role, remove/deactivate
- ⏳ Invite-by-link flow — right now a manager/owner sets the new staff's password directly; a proper "invite, they set their own password" flow is a recommended upgrade
- ⏳ Resend-invite — depends on the invite flow above

## Products
- ✅ Categories: search, select, or create inline
- ✅ Products: full CRUD, image upload, activate/deactivate, search/filter, pagination
- ✅ Owner/manager can manage; staff can view only
- ⏳ Stock quantity is not live yet — depends on Inventory (below)

## Platform Admin (superuser)
- ✅ Separate admin interface (`/admin`) with its own unlisted login URL
- ✅ Review & manage every organization: approve / reject / suspend / reactivate / remove
- ✅ Manage every user account: list, search, activate/deactivate, see which organizations they belong to
- ✅ Platform overview: shop counts by status, user counts
- ⏳ Web UI to promote a user to superuser — currently CLI-only (`app/cli/superadmin.py`)

## Not Started (business decision needed on priority)
- ⏳ **Inventory** — stock in/out, batch tracking. Needed before Sales can work.
- ⏳ **Sales** — recording transactions, returns. Depends on Inventory.
- ⏳ **Purchases** — buying stock from suppliers, purchase returns.
- ⏳ **Expenses** — shop expense tracking.
- ⏳ **Audit log** — who did what, when (schema exists, nothing reads/writes it yet).
- ⏳ **Reports/Overview numbers** — today's sales, revenue, low stock on the dashboard home — depends on Sales + Inventory.

## Recommended, not yet requested
- ⏳ Real file storage (S3) — only local disk works today; fine for one server, not for scaling or multiple deployments.
- ⏳ Automated tests on the frontend — backend has tests, frontend has none yet.

## My suggested order
1. Inventory → 2. Sales → 3. Reports/Overview numbers → 4. Purchases & Expenses → 5. Audit log → 6. Real SMS provider → 7. Invite-by-link for staff → 8. Multi-shop switch UI → 9. S3 storage
