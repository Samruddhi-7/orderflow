# OrderFlow

OrderFlow is a high-performance, multi-vendor food and grocery order management platform (Swiggy/Zomato-style) designed as a portfolio showcase. It demonstrates production-ready patterns for handling concurrency, role-based access control (RBAC), caching, rate limiting, and idempotency.

## Project Structure

```text
/cmd/api             - main entrypoint (wireup, graceful shutdown)
/internal/handler    - HTTP handlers (Gin, routing, endpoint controllers)
/internal/service    - Business logic services layer
/internal/repository - DB access layer (sqlc-generated structs + transaction wrappers)
/internal/middleware - Auth, RBAC, Rate limiting, CORS
/migrations          - SQL migration files
/web                 - Next.js + TypeScript + Tailwind CSS frontend
docker-compose.yml   - Postgres + Redis + Go API local environment
Dockerfile           - Go multi-stage build container
.github/workflows    - GitHub Actions CI workflow
.env.example         - Environment variables configuration template
```

## Core Decisions & Best Practices

1. **Idempotency**: Orders table features a `UNIQUE` index constraint on `idempotency_key` to prevent duplicate order charges or creations on double-tap/client-retries.
2. **Historial Consistency**: Order item price `price_at_order_time` is stored statically inside `order_items` rather than joined from `menu_items` at runtime, ensuring complete isolation from future menu price adjustments.
3. **Database Performance**:
   - Compiles SQL queries into type-safe, optimized Go code with `sqlc`.
   - Custom composite index on `orders(vendor_id, status)` for fast merchant order boards.
   - Composite index on `menu_items(vendor_id, is_available)` to serve active catalogs instantly.

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (including docker-compose)
- [Go 1.22+](https://go.dev/) (optional, if running locally without Docker)
- [Node.js 20+](https://nodejs.org/) (optional, for running the frontend local server)

### Local Dev Launch

1. Create your local environment file:
   ```bash
   cp .env.example .env
   ```

2. Run the application stack:
   ```bash
   docker-compose up --build
   ```
   This will boot:
   - **PostgreSQL** (Port `5432` with mapped state volume)
   - **Redis** (Port `6379`)
   - **Go Backend API** (Port `8080`)
