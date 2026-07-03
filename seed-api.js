const apiBase = "http://localhost:8080/api/v1";

const vendorData = [
  {
    email: "vendor1@example.com",
    password: "password",
    vendor: {
      name: "Artisan Bistro",
      address: "12 MG Road, Indiranagar, Bangalore",
      is_open: true,
      image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop"
    },
    items: [
      { name: "Truffle Mushroom Pasta", price: 349, stock_qty: 30, is_available: true, image_url: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300&h=300&fit=crop" },
      { name: "Grilled Chicken Salad", price: 249, stock_qty: 25, is_available: true, image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop" },
      { name: "Classic Margherita Pizza", price: 299, stock_qty: 20, is_available: true, image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&h=300&fit=crop" },
      { name: "Berry Smoothie Bowl", price: 199, stock_qty: 15, is_available: true, image_url: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=300&h=300&fit=crop" },
    ]
  },
  {
    email: "vendor2@example.com",
    password: "password",
    vendor: {
      name: "Tandoori Nights",
      address: "45 Church Street, Shivajinagar, Pune",
      is_open: true,
      image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop"
    },
    items: [
      { name: "Butter Chicken with Naan", price: 399, stock_qty: 40, is_available: true, image_url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300&h=300&fit=crop" },
      { name: "Veg Biryani", price: 279, stock_qty: 35, is_available: true, image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&h=300&fit=crop" },
      { name: "Paneer Tikka", price: 229, stock_qty: 30, is_available: true, image_url: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300&h=300&fit=crop" },
      { name: "Dal Makhani", price: 199, stock_qty: 50, is_available: true, image_url: "https://images.unsplash.com/photo-1546833998-88777d1b6e5a?w=300&h=300&fit=crop" },
    ]
  },
  {
    email: "vendor3@example.com",
    password: "password",
    vendor: {
      name: "Tokyo Ramen House",
      address: "78 Park Street, Sector 29, Gurgaon",
      is_open: false,
      image_url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&h=400&fit=crop"
    },
    items: [
      { name: "Tonkotsu Ramen", price: 449, stock_qty: 1, is_available: false, image_url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=300&fit=crop" },
      { name: "Spicy Miso Ramen", price: 399, stock_qty: 20, is_available: true, image_url: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=300&h=300&fit=crop" },
      { name: "Gyoza (6 pcs)", price: 179, stock_qty: 25, is_available: true, image_url: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=300&h=300&fit=crop" },
    ]
  },
  {
    email: "vendor4@example.com",
    password: "password",
    vendor: {
      name: "Green Leaf Cafe",
      address: "201 Defence Colony, New Delhi",
      is_open: true,
      image_url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop"
    },
    items: [
      { name: "Avocado Toast", price: 299, stock_qty: 20, is_available: true, image_url: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=300&h=300&fit=crop" },
      { name: "Quinoa Power Bowl", price: 349, stock_qty: 15, is_available: true, image_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop" },
      { name: "Cold Brew Coffee", price: 149, stock_qty: 50, is_available: true, image_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&h=300&fit=crop" },
      { name: "Matcha Latte", price: 199, stock_qty: 30, is_available: true, image_url: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=300&h=300&fit=crop" },
    ]
  }
];

async function main() {
  for (const v of vendorData) {
    // Register
    const regRes = await fetch(apiBase + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: v.email, password: v.password, role: "vendor" })
    });
    if (!regRes.ok) {
      const err = await regRes.text();
      console.log(`Register ${v.email}: ${regRes.status} - ${err}`);
      // Try login instead (user may already exist)
    }

    // Login
    const loginRes = await fetch(apiBase + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: v.email, password: v.password })
    });
    if (!loginRes.ok) {
      console.error(`Login failed for ${v.email}: ${await loginRes.text()}`);
      continue;
    }
    const { access_token } = await loginRes.json();

    // Create vendor profile
    const vendorRes = await fetch(apiBase + "/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + access_token },
      body: JSON.stringify(v.vendor)
    });
    if (!vendorRes.ok) {
      console.error(`Vendor create failed for ${v.email}: ${await vendorRes.text()}`);
      continue;
    }
    const vendor = await vendorRes.json();
    console.log(`Created vendor: ${vendor.name} (${vendor.id})`);

    // Create menu items
    for (const item of v.items) {
      const itemRes = await fetch(apiBase + `/vendors/${vendor.id}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + access_token },
        body: JSON.stringify(item)
      });
      if (!itemRes.ok) {
        console.error(`  Failed to create item ${item.name}: ${await itemRes.text()}`);
      } else {
        console.log(`  Created item: ${item.name}`);
      }
    }

    // Also register customer user
    await fetch(apiBase + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "customer@example.com", password: "password", role: "customer" })
    }).catch(() => {});
  }

  console.log("\nSeeding complete!");
  console.log("Customer login:  customer@example.com / password");
  for (const v of vendorData) {
    console.log(`Vendor login:    ${v.email} / ${v.password}`);
  }
}

main().catch(console.error);
