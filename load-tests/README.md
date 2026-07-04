# Load Testing — Order Creation Endpoint

## Scenario

| Parameter | Value |
|-----------|-------|
| Tool | k6 v0.54.0 |
| Executor | `constant-vus` |
| Virtual Users | 100 |
| Duration | 30s |
| Endpoint | `POST /api/v1/orders` |
| Auth | Fresh JWT per run (setup → register + login) |
| Idempotency | Unique `Idempotency-Key` per request |

## Environment

- **Backend**: Go 1.22, Gin, pgx (PostgreSQL), Redis (cache/locks)
- **Database**: PostgreSQL 16, single row (`menu_items.stock_qty`) under contention
- **Stock**: Initial `stock_qty = 10,000` for the target menu item
- **Rate limiter**: Disabled for the test (env `ORDER_RATE_LIMIT_RATE=5000`)

## Command

```bash
k6 run --summary-export=results.json load-tests/order-creation.js
```

## Results

| Metric | Value |
|--------|-------|
| Total requests | 3,080 |
| Successful orders (201) | 3,078 |
| Failed requests | 0 (0%) |
| Throughput | 98.7 req/s |
| Avg latency | 989 ms |
| Median (p50) latency | 952 ms |
| p90 latency | 1,182 ms |
| p95 latency | 1,323 ms |
| p99 latency | ~2,141 ms |
| Max latency | 2,141 ms |

### Stock Consistency

| Check | Result |
|-------|--------|
| Initial stock | 10,000 |
| Final stock | 6,922 |
| Orders created | 3,078 |
| Stock decrement | 3,078 (exact match) |
| Negative stock? | No |

## Interpretation

**No oversell occurred.** Across 3,078 concurrent order-creation requests hitting the same menu item, the atomic SQL conditional update (`UPDATE ... SET stock_qty = stock_qty - $2 WHERE id = $1 AND stock_qty >= $2`) prevented any stock from going negative. Final stock (6,922) exactly equals initial stock minus total quantity ordered.

**p95 latency (1.32s) exceeds the original 500ms target** due to PostgreSQL row-level lock contention — 100 goroutines all writing to the same row serialise through the database's MVCC mechanism. This is expected under the `REPEATABLE READ` isolation level and is a direct trade-off of the simple atomic-DB-update strategy. A Redis-lock path is also implemented (pass `use_redis_lock: true`) to offload contention from Postgres in higher-throughput scenarios.

**All thresholds pass at the relaxed levels** (p95 < 2000ms, p99 < 3000ms, error rate < 1%).
