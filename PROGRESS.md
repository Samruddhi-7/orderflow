# OrderFlow Build Progress

## Status
- [x] Phase 1 — Schema, migrations, scaffold
- [x] Phase 2 — Auth & RBAC
- [x] Phase 3 — Vendor & menu endpoints + Redis caching
- [x] Phase 4 — Orders, concurrency, idempotency
- [ ] Phase 5 — Admin endpoints
- [ ] Phase 6 — Testing
- [ ] Phase 7 — Frontend
- [ ] Phase 8 — Docker, CI/CD, README

## Last completed
Phase 4 — Orders creation, concurrency handling with DB transactions/locks, and idempotency key checks.
Commit: f15c20f

## Next up
Phase 5 — Admin endpoints

## Notes / decisions to remember
- Chose sqlc over GORM for raw SQL control.
- Chose Gin over Fiber.
