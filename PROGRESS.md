# OrderFlow Build Progress

## Status
- [x] Phase 1 — Schema, migrations, scaffold
- [x] Phase 2 — Auth & RBAC
- [ ] Phase 3 — Vendor & menu endpoints + Redis caching
- [ ] Phase 4 — Orders, concurrency, idempotency
- [ ] Phase 5 — Admin endpoints
- [ ] Phase 6 — Testing
- [ ] Phase 7 — Frontend
- [ ] Phase 8 — Docker, CI/CD, README

## Last completed
Phase 2 — implemented JWT access+refresh with rotation and reuse detection.
Commit: f4c00b4

## Next up
Phase 3 — start with vendor CRUD endpoints, then menu endpoints, then wire Redis caching with short TTL + invalidation on vendor update.

## Notes / decisions to remember
- Chose sqlc over GORM for raw SQL control.
- Chose Gin over Fiber.
