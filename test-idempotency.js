const apiBase = "http://localhost:8080/api/v1";

async function main() {
  // Login Customer
  const loginRes = await fetch(apiBase + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "customer@example.com", password: "password" })
  });
  const { access_token } = await loginRes.json();
  
  // Get Vendor and Menu
  const vendorsRes = await fetch(apiBase + "/vendors", {
    headers: { "Authorization": "Bearer " + access_token }
  });
  const vendors = await vendorsRes.json();
  console.log("Vendors:", vendors);
  const vendorId = vendors[0].id;

  const menuRes = await fetch(apiBase + `/vendors/${vendorId}/menu`, {
    headers: { "Authorization": "Bearer " + access_token }
  });
  const menu = await menuRes.json();
  console.log("Menu:", menu);
  const menuItemId = menu[0].id;
  
  const idempotencyKey = "client-key-" + Date.now();
  const orderPayload = {
    vendor_id: vendorId,
    items: [{ menu_item_id: menuItemId, qty: 1 }],
    use_redis_lock: true
  };

  console.log("Firing Request 1");
  const res1 = await fetch(apiBase + "/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + access_token, "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(orderPayload)
  });
  const body1 = await res1.json();
  console.log("Response 1:", body1);

  console.log("Firing Request 2 with same idempotency key");
  const res2 = await fetch(apiBase + "/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + access_token, "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(orderPayload)
  });
  const body2 = await res2.json();
  console.log("Response 2:", body2);

  if (body1.id === body2.id) {
    console.log("SUCCESS: Idempotency works! Only one order was created.");
  } else {
    console.error("FAIL: Created different orders!");
  }
}

main().catch(console.error);
