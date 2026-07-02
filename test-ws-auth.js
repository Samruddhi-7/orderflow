const WebSocket = require('ws');

const apiBase = "http://localhost:8080/api/v1";
const wsBase = "ws://localhost:8080/api/v1";

async function makeUser(email, role) {
  let res = await fetch(apiBase + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password", role })
  });
  res = await fetch(apiBase + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password" })
  });
  const data = await res.json();
  return data.access_token;
}

async function main() {
  console.log("Setting up users...");
  const vendorToken = await makeUser("vend_ws@example.com", "vendor");
  
  // Setup vendor
  let vRes = await fetch(apiBase + "/vendors", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + vendorToken },
    body: JSON.stringify({ name: "WS Vendor", address: "123 Main St", is_open: true })
  });
  let vendor = await vRes.json();
  if (!vendor.id) {
    const listRes = await fetch(apiBase + "/vendors", { headers: { "Authorization": "Bearer " + vendorToken } });
    const list = await listRes.json();
    vendor = list.find(v => v.name === "WS Vendor") || list[0];
  }
  
  let mRes = await fetch(apiBase + `/vendors/${vendor.id}/menu`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + vendorToken },
    body: JSON.stringify({ name: "WS Item", price: 5.99, stock_qty: 10, is_available: true })
  });
  let menuItem = await mRes.json();
  if (!menuItem.id) {
    const listRes = await fetch(apiBase + `/vendors/${vendor.id}/menu`, { headers: { "Authorization": "Bearer " + vendorToken } });
    const list = await listRes.json();
    menuItem = list[0];
  }

  // Create two customers
  const customerA = await makeUser("custA@example.com", "customer");
  const customerB = await makeUser("custB@example.com", "customer");

  // Customer A places order
  const orderRes = await fetch(apiBase + "/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + customerA, "Idempotency-Key": "ws-key-1" },
    body: JSON.stringify({ vendor_id: vendor.id, items: [{ menu_item_id: menuItem.id, qty: 1 }], use_redis_lock: false })
  });
  const order = await orderRes.json();
  console.log("Created order for Customer A:", order.id);

  console.log("\n--- Testing Authentication & Data Leakage ---");
  // Customer B tries to listen to Customer A's order
  console.log("Attempting connection with Customer B's token...");
  const wsB = new WebSocket(`${wsBase}/orders/${order.id}/track?token=${customerB}`);
  wsB.on('unexpected-response', (req, res) => {
    if (res.statusCode === 403) {
      console.log("[PASS] Customer B connection rejected with 403 Forbidden");
    } else {
      console.log(`[FAIL] Customer B rejected with unexpected status: ${res.statusCode}`);
    }
  });
  wsB.on('open', () => {
    console.log("[FAIL] Customer B was able to connect to Customer A's order track!");
    wsB.close();
  });

  // Customer A listens to their own order
  console.log("\nAttempting connection with Customer A's token...");
  const wsA = new WebSocket(`${wsBase}/orders/${order.id}/track?token=${customerA}`);
  wsA.on('open', () => {
    console.log("[PASS] Customer A successfully connected");
    
    // Now vendor updates the order to trigger a broadcast
    console.log("\nVendor updating order status to 'confirmed'...");
    fetch(apiBase + `/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + vendorToken },
      body: JSON.stringify({ status: "confirmed" })
    }).catch(console.error);
  });

  wsA.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log(`[PASS] Customer A received live update:`, msg);
    
    if (msg.status === "confirmed") {
      console.log("All WS tests passed.");
      wsA.close();
      process.exit(0);
    }
  });

  wsA.on('unexpected-response', (req, res) => {
    console.log(`[FAIL] Customer A rejected with status: ${res.statusCode}`);
  });
}

main().catch(console.error);
