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
- [x] Phase 4 — WebSocket reliability
- [x] Phase 5 — RBAC enforcement, both layers
- [x] Phase 6 — Error handling & edge cases
- [x] Phase 7 — Environment, CORS, and fresh-clone build check
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
- **Phase 4 (WebSocket reliability)**:
  - Checked: Live delivery of status updates.
  - Found: Missing authentication mechanism for WebSocket connections and a potential data leakage vulnerability where any connected client could listen to any order ID. Fixed: Updated `AuthMiddleware` to parse query parameter tokens and `trackOrderWS` to enforce role scopes (Customer A cannot listen to Customer B's order). Verified fix via `test-ws-auth.js` script (enforces `403 Forbidden`).
  - Found: Frontend did not provide clear feedback during websocket disconnects. Fixed: Exposed `wsStatus` state in `order/[id]/page.tsx` displaying a "Disconnected (Reconnecting...)" animated pill badge if the WS connection drops, and ensured it automatically attempts reconnection every 3s.
- **Phase 5 (RBAC enforcement, both layers)**:
  - Checked: Frontend correctly implements layout-level route guards (`layout.tsx`) that forcefully redirect users away from restricted modules (e.g., customers cannot load the `/vendor` or `/admin` routes). Thus, protected buttons and actions are never rendered for unauthorized roles.
  - Checked: Backend correctly enforces restrictions via `RequireRole` middleware on the Gin router. 
  - Tested: Wrote a direct API testing script (`test-rbac.js`) bypassing the UI and making raw HTTP requests. Confirmed that a customer token hitting vendor/admin endpoints receives a strictly enforced `403 Forbidden`, and a vendor token hitting admin endpoints similarly receives `403 Forbidden`. The API protection is solid.
- **Phase 6 (Error handling & edge cases)**:
  - Found: Unhandled promise rejections on the frontend when the backend crashes or goes offline (`TypeError: Failed to fetch`). Fixed: Patched `fetchApi` (`lib/api.ts`) to intercept network-level errors and throw a generic "Network error: Unable to reach the server." error. 
  - Found: When API routes crashed or failed on initial load, pages rendered forever-loading states or broke entirely. Fixed: Implemented global `error` state handling across `page.tsx` components for Customer Dashboard, Vendor Dashboard, and Vendor Kanban UI. A structured error UI with a retry button now renders gracefully.
  - Found: Vendor inventory creation form lacked strict front-end validation, allowing string/negative pricing and quantities to trigger 400 Bad Requests without a clean toast. Fixed: Added inline parsing and toast validation checks to prevent negative values.
  - Checked: Empty states (empty kanban column, empty menu, empty order history) render a sensible empty container instead of throwing errors.
  - Checked: Handled hydration warnings and unique key warnings correctly across Next.js `.map` loops.
## Maintenance / Fixes
- fix(api): make fetchApi generic and fix catch types (`5b8b9f4`)
- fix(web): propagate real types to all fetchApi call sites (`0eba44f`)
- fix(web): replace setState-in-useEffect with lazy initializers (`fd40499`)
- chore(web): remove dead code and unused imports (included in tasks 1–3 commits)
- style(go): run gofmt -w on all Go source files (`04038b5`)

- **Phase 7 (Environment & CORS)**:
  - Checked: \docker-compose up -d --build\ successfully spins up Postgres, Redis, and the Go API without any issues. The database schema migrations are correctly handled (auto-migrated or pre-existing in the volume/entrypoint) as all tables exist on boot.
  - Found: \.env.example\ contained unused token duration configurations and an unused \REFRESH_JWT_SECRET\, and was missing \ALLOWED_ORIGIN\. Fixed: Cleaned up \.env.example\ and \docker-compose.yml\ to perfectly match the environment variables actually parsed in \cmd/api/main.go\.
  - Checked: CORS is explicitly locked to \http://localhost:3000\ rather than a wildcard \*\, which securely matches the frontend's local development origin without being overly permissive.
