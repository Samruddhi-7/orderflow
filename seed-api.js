const apiBase = "http://localhost:8080/api/v1";

async function main() {
  // Register Customer
  await fetch(apiBase + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "customer@example.com", password: "password", role: "customer" })
  });

  // Register Vendor
  const vRes = await fetch(apiBase + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "vendor@example.com", password: "password", role: "vendor" })
  });
  
  // Login Vendor
  const loginRes = await fetch(apiBase + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "vendor@example.com", password: "password" })
  });
  const { access_token } = await loginRes.json();
  
  // Create Vendor Profile
  const vendorRes = await fetch(apiBase + "/vendors", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + access_token },
    body: JSON.stringify({ name: "Awesome Burgers", address: "123 Main St", is_open: true })
  });
  const vendor = await vendorRes.json();
  console.log("Created vendor:", vendor);
  
  // Create Menu Item
  const menuCreateRes = await fetch(apiBase + `/vendors/${vendor.id}/menu`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + access_token },
    body: JSON.stringify({
      name: "Classic Burger",
      price: 9.99,
      stock_qty: 100,
      is_available: true
    })
  });
  console.log("Menu item create status:", menuCreateRes.status, await menuCreateRes.text());
  console.log("Seeded successfully!");
}

main().catch(console.error);
