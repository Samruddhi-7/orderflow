# OrderFlow 🍔

> A scalable, multi-vendor food ordering platform built for high concurrency.
> 
> [**Live Demo**](#) | [**API Documentation**](#swagger-openapi-docs)

![Go](https://img.shields.io/badge/Go-1.22-00ADD8?style=for-the-badge&logo=go)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)

---

## 📸 Preview

*(Placeholder for Screenshot/GIF of the Customer and Vendor Dashboards in action)*

---

## 🏗️ Architecture

```mermaid
graph TD
    Client[Next.js Frontend] -->|REST & WebSockets| API[Go API Server]
    API -->|Read/Write| DB[(PostgreSQL 16)]
    API -->|Caching & Locks| Cache[(Redis 7)]
    
    sublayer1[Core Services]
    API -.-> sublayer1
    sublayer1 -.-> Auth[Auth & RBAC]
    sublayer1 -.-> Inventory[Menu & Inventory]
    sublayer1 -.-> Orders[Order Pipeline]
    
    sublayer2[Concurrency Handlers]
    Orders -.-> sublayer2
    sublayer2 -.-> Atomic[DB Atomic Updates]
    sublayer2 -.-> Mutex[Redis SETNX Locks]
```

---

## 🧠 Key Engineering Decisions

### 1. Concurrency Control (The "Overselling" Problem)
When multiple customers attempt to purchase a limited-stock item simultaneously, standard read-modify-write cycles lead to race conditions and negative inventory.

**Solution**: OrderFlow implements two defensive strategies that can be toggled:
- **Atomic Database Updates**: `UPDATE menu_items SET stock_qty = stock_qty - $2 WHERE id = $1 AND stock_qty >= $2`. This leverages Postgres' internal row locking to guarantee stock never drops below zero, even under massive concurrent load.
- **Distributed Redis Locks**: Uses Redis `SETNX` with a TTL as a fast-path mutex to serialize requests before they hit the database, reducing DB contention.

### 2. Safe Idempotency
Network instability often causes clients to retry `POST /api/v1/orders`. 
- **Solution**: Every order request requires a unique `Idempotency-Key` header. A unique constraint in Postgres guarantees that retried requests are safely intercepted, preventing duplicate charges.

### 3. Real-Time Tracking
- **Solution**: Gorilla WebSockets broadcast real-time order status updates from the Vendor to the Customer seamlessly.

---

## 🚀 Setup & Installation

Running the entire stack locally is incredibly simple.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 1. Clone & Configure
```bash
git clone https://github.com/Samruddhi-7/orderflow.git
cd orderflow
cp .env.example .env
```

### 2. Spin up the Stack
```bash
docker-compose up --build -d
```
This single command will:
1. Start a PostgreSQL database and run all schema migrations automatically.
2. Start a Redis cache.
3. Build the Go API into an optimized, multi-stage Alpine Docker image and expose it on `http://localhost:8080`.

### 3. Run the Frontend (Optional)
```bash
cd web
npm install
npm run dev
```
Access the frontend at `http://localhost:3000`.

---

## 🧪 Testing

The codebase includes rigorous unit and integration tests.

### What's Covered?
- **Integration (testcontainers-go)**: The `TestOrderConcurrency` test spins up a real Postgres database and fires 100 concurrent goroutines to purchase a single low-stock item, actively proving the overselling protections work.
- **Unit (Auth & RBAC)**: Verifies JWT token generation, parsing, and role-based access control middleware.

### Run Tests
Make sure Docker is running (required for `testcontainers-go`), then execute:
```bash
go test -v ./...
```

---

## 📖 Swagger/OpenAPI Docs

*(Placeholder for Swagger UI / OpenAPI documentation link)*
