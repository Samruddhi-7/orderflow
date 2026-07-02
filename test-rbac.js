const apiBase = "http://localhost:8080/api/v1";

async function makeUser(email, role) {
  // Register
  let res = await fetch(apiBase + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password", role })
  });
  
  if (res.status === 400) {
    // maybe already exists
  }

  // Login
  res = await fetch(apiBase + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password" })
  });
  const data = await res.json();
  return data.access_token;
}

async function testEndpoint(name, method, url, token, expectedStatus) {
  const res = await fetch(apiBase + url, {
    method,
    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
    body: method !== "GET" ? JSON.stringify({}) : undefined
  });
  
  const status = res.status;
  if (status === expectedStatus) {
    console.log(`[PASS] ${name} returned ${status} as expected.`);
  } else {
    console.error(`[FAIL] ${name} returned ${status}, expected ${expectedStatus}. Body:`, await res.text());
  }
}

async function main() {
  console.log("Setting up users...");
  const customerToken = await makeUser("cust_rbac@example.com", "customer");
  const vendorToken = await makeUser("vend_rbac@example.com", "vendor");
  const adminToken = await makeUser("admin_rbac@example.com", "admin");

  console.log("\n--- Testing Customer Role ---");
  // Customer should NOT access vendor endpoints
  await testEndpoint("Customer -> Create Vendor", "POST", "/vendors", customerToken, 403);
  await testEndpoint("Customer -> Update Order Status", "PATCH", "/orders/some-id/status", customerToken, 403);
  // Customer should NOT access admin endpoints
  await testEndpoint("Customer -> Admin Analytics", "GET", "/admin/analytics", customerToken, 403);

  console.log("\n--- Testing Vendor Role ---");
  // Vendor should NOT access admin endpoints
  await testEndpoint("Vendor -> Admin Vendors", "GET", "/admin/vendors", vendorToken, 403);
  // Vendor CAN access vendor endpoints (400 Bad Request because body is empty, NOT 403 Forbidden)
  await testEndpoint("Vendor -> Create Vendor", "POST", "/vendors", vendorToken, 400);

  console.log("\n--- Testing Admin Role ---");
  // Admin CAN access admin endpoints (might return 200)
  await testEndpoint("Admin -> Admin Analytics", "GET", "/admin/analytics", adminToken, 200);
}

main().catch(console.error);
