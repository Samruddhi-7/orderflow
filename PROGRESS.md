# OrderFlow Build Progress

## Status
- [x] Phase 1 — Schema, migrations, scaffold
- [x] Phase 2 — Auth & RBAC
- [x] Phase 3 — Vendor & menu endpoints + Redis caching
- [ ] Phase 4 — Orders, concurrency, idempotency
- [ ] Phase 5 — Admin endpoints
- [ ] Phase 6 — Testing
- [ ] Phase 7 — Frontend
- [ ] Phase 8 — Docker, CI/CD, README

## Last completed
Phase 3 — Implemented Vendor and Menu item endpoints with Redis caching, TTLs, and cache invalidation.
Commit: 3856327

## Next up
Phase 4 — Orders creation, concurrency handling with DB transactions/locks, and idempotency key checks.

## Notes / decisions to remember
- Chose sqlc over GORM for raw SQL control.
- Chose Gin over Fiber.
