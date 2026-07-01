# OrderFlow Build Progress

## Status
- [x] Phase 1 — Schema, migrations, scaffold
- [x] Phase 2 — Auth & RBAC
- [x] Phase 3 — Vendor & menu endpoints + Redis caching
- [x] Phase 4 — Orders, concurrency, idempotency
- [x] Phase 5 — Admin endpoints
- [x] Phase 6 — Testing
- [x] Phase 7 — Frontend
- [ ] Phase 8 — Docker, CI/CD, README

## Last completed
Phases 5, 6, and 7 — Admin endpoints, Unit & Integration Testing with testcontainers-go, and Next.js frontend with live WebSockets.

## Next up
Phase 8 — Docker, CI/CD, README

## Notes / decisions to remember
- Chose sqlc over GORM for raw SQL control.
- Chose Gin over Fiber.
