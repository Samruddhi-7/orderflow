const http = require('http');

async function testApi() {
  // 1. Register User
  const regRes = await fetch("http://localhost:8080/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", password: "password123", role: "vendor" })
  });
  const regData = await regRes.json();
  console.log("Register:", regRes.status, regData);

  // 2. Login User
  const logRes = await fetch("http://localhost:8080/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", password: "password123" })
  });
  const logData = await logRes.json();
  console.log("Login:", logRes.status, logData);

  const token = logData.access_token;
  
  // 3. Create Vendor
  const vendRes = await fetch("http://localhost:8080/api/v1/vendors", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}` 
    },
    body: JSON.stringify({ name: "Test Vendor", address: "123 Main St", is_open: true })
  });
  const vendData = await vendRes.json();
  console.log("Create Vendor:", vendRes.status, vendData);
  
  const vendorId = vendData.id;

  // 4. Create Menu Item (Simulate frontend sending price as string and is_available)
  const menuRes = await fetch(`http://localhost:8080/api/v1/vendors/${vendorId}/menu`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}` 
    },
    body: JSON.stringify({ name: "Avocado Toast", price: "9.99", stock_qty: 50, is_available: true })
  });
  const menuData = await menuRes.json();
  console.log("Create Menu Item:", menuRes.status, menuData);

  if (menuRes.ok) {
    const itemId = menuData.id;
    // 5. Update Stock (Simulate frontend sending extra is_available)
    const stockRes = await fetch(`http://localhost:8080/api/v1/vendors/${vendorId}/menu/${itemId}/stock`, {
        method: "PATCH",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ stock_qty: 45, is_available: true })
    });
    const stockData = await stockRes.json();
    console.log("Update Stock:", stockRes.status, stockData);
  }
}

testApi();
