# OrderFlow Build Progress

## Status
- [x] Phase 1 — Schema, migrations, scaffold
- [x] Phase 2 — Auth & RBAC
- [x] Phase 3 — Vendor & menu endpoints + Redis caching
- [x] Phase 4 — Orders, concurrency, idempotency
- [x] Phase 5 — Admin endpoints
- [x] Phase 6 — Testing
- [x] Phase 7 — Frontend
- [x] Phase 8 — Docker, CI/CD, README

## Last completed
Phase 8 — Docker, CI/CD setup, README and finalized repository.

## Next up
🎉 All phases complete! The OrderFlow multi-vendor platform is successfully built.

## Notes / decisions to remember
- Chose sqlc over GORM for raw SQL control.
- Chose Gin over Fiber.

## Frontend Redesign
- [x] Phase A — Design tokens & component foundation
- [x] Phase B — Customer flow (browse, menu, cart, checkout)
- [x] Phase C — Order tracking (signature live timeline)
- [x] Phase D — Vendor dashboard (Kanban order management)
- [x] Phase E — Admin dashboard
- [x] Phase F — Responsive polish, accessibility, motion pass

### Last completed
Phase F — Responsive polish, accessibility, motion pass

### Next up
🎉 Frontend Redesign Complete! 🎉

## Integration & QA Audit
- [x] Phase 1 — Contract audit (does frontend match backend, endpoint by endpoint)
- [x] Phase 2 — Auth flow end-to-end
- [x] Phase 3 — Order lifecycle end-to-end, including concurrency/idempotency
- [ ] Phase 4 — WebSocket reliability
- [ ] Phase 5 — RBAC enforcement, both layers
- [ ] Phase 6 — Error handling & edge cases
- [ ] Phase 7 — Environment, CORS, and fresh-clone build check
- [ ] Phase 8 — Static analysis, tests, and lint, clean run

### Findings log
- **Phase 1 (Contract Audit)**:
  - Found: `/auth/login` backend didn't return user object, but frontend expected `res.user`. Fixed: Extracted user from decoded JWT token on frontend (`web/src/app/page.tsx`).
  - Found: `/vendors/:id/menu` POST expected float `price`, frontend sent string. Fixed: Added `parseFloat(newItemPrice)` (`web/src/app/vendor/page.tsx`).
  - Found: `/vendors/:id/menu/:item_id/stock` PATCH sent extraneous `is_available` field. Fixed: Removed field from frontend payload (`web/src/app/vendor/page.tsx`).
  - Found: `/vendors` and `/admin/vendors` endpoints returned `is_open` and `address`, but frontend expected `status` and `description`. Fixed: Updated frontend `Vendor` types and rendering logic across customer dashboard, vendor menu, and admin dashboard (`page.tsx` files).
- **Phase 2 (Auth Flow)**:
  - Checked: Refresh token generation, reuse detection, and role guards on backend are robust and working as intended.
  - Found: Frontend `fetchApi` did not intercept `401 Unauthorized` responses and ignored refresh tokens entirely. Fixed: Implemented a robust 401 interceptor in `web/src/lib/api.ts` that saves the refresh token, calls `/auth/refresh` when an access token expires, and retries the original request.
  - Found: Frontend `logout` merely cleared `localStorage` and skipped notifying the backend. Fixed: Modified `AuthProvider.tsx` to explicitly POST to `/api/v1/auth/logout` with the active refresh token to ensure server-side revocation.
  - Checked: Next.js frontend route guards (`user.role !== "admin"` etc.) effectively enforce the same RBAC scopes as the Gin middleware on the backend.
- **Phase 3 (Order Lifecycle & Concurrency)**:
  - Checked: Out-of-stock errors surface cleanly on the frontend as structured errors rather than silent failures.
  - Checked: Order placement, vendor state progression (via Kanban), and live customer updates work correctly. Customer cancellation is present on the vendor UI as expected.
  - Tested: Concurrency prevention logic (Atomic DB decrement vs. Redis SETNX lock) is completely functional and prevents overselling.
  - Tested: Tested idempotency with the `Idempotency-Key` header end-to-end via the real API, confirming only one order is generated per unique key.
  - Fixed: Migrated `TestOrderConcurrency` to use `testcontainers-go` (just like `TestOrderService_Integration`), ensuring the integration test reliably runs in all environments (including GitHub Actions) and isn't silently skipped. Fixed local DB constraints preventing it from passing.
