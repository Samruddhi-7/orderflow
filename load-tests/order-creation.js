import http from 'k6/http';
import { check } from 'k6';

const API_BASE = 'http://localhost:8080/api/v1';

// Vendor & menu item from Green Leaf Cafe (seeded with stock_qty=10000)
const VENDOR_ID = 'e11151d4-7dce-4680-a898-d7f43f39dbd7';
const MENU_ITEM_ID = '1ba98aff-343f-48e6-a4c8-e865f7ed0ad4';

export const options = {
  scenarios: {
    order_creation: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<3000'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  // Register a fresh customer for the load test
  const email = `loadtest-${Date.now()}@example.com`;
  const password = 'password';

  http.post(`${API_BASE}/auth/register`, JSON.stringify({
    email,
    password,
    role: 'customer',
  }), { headers: { 'Content-Type': 'application/json' } });

  const loginRes = http.post(`${API_BASE}/auth/login`, JSON.stringify({
    email,
    password,
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, { 'login succeeded': (r) => r.status === 200 });

  const token = loginRes.json('access_token');
  return { token, email };
}

export default function (data) {
  const { token } = data;
  const idempotencyKey = `k6-${__VU}-${__ITER}-${Date.now()}`;

  const payload = JSON.stringify({
    vendor_id: VENDOR_ID,
    items: [{ menu_item_id: MENU_ITEM_ID, qty: 1 }],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
  };

  const res = http.post(`${API_BASE}/orders`, payload, params);

  check(res, {
    'status is 201': (r) => r.status === 201,
    'order has id': (r) => r.json('id') !== undefined,
  });
}
