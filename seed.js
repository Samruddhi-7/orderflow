const { Pool } = require('pg');

async function seed() {
  const pool = new Pool({ connectionString: 'postgres://orderflow_user:orderflow_password@localhost:5432/orderflow_db' });
  const client = await pool.connect();

  try {
    // Clean up
    await client.query('DELETE FROM users');

    // Create customer
    const cRes = await client.query(`
      INSERT INTO users (email, password_hash, role) 
      VALUES ('customer@example.com', '$2a$10$tZt6371YjF2z7L9O6M6HhOg2oT8XfN2YxO1N2O3P4Q5R6S7T8U9V', 'customer') 
      RETURNING id
    `);
    const customerId = cRes.rows[0].id;

    // Create vendor user
    const vRes = await client.query(`
      INSERT INTO users (email, password_hash, role) 
      VALUES ('vendor@example.com', '$2a$10$tZt6371YjF2z7L9O6M6HhOg2oT8XfN2YxO1N2O3P4Q5R6S7T8U9V', 'vendor') 
      RETURNING id
    `);
    const vendorUserId = vRes.rows[0].id;

    // Create vendor profile
    const pRes = await client.query(`
      INSERT INTO vendors (user_id, name, address, is_open) 
      VALUES ($1, 'Awesome Burgers', '123 Main St', true) 
      RETURNING id
    `, [vendorUserId]);
    const vendorId = pRes.rows[0].id;

    // Create menu items
    await client.query(`
      INSERT INTO menu_items (vendor_id, name, price, stock_qty, is_available) 
      VALUES ($1, 'Classic Burger', 9.99, 100, true)
    `, [vendorId]);

    console.log('Database seeded successfully!');
    console.log('Customer: customer@example.com / password (assuming bcrypt hash for password is "password" but actually the hash is mock, so use the API endpoint to register)');
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
