const { Client } = require('pg');

async function listMerchants() {
  const connectionString = 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    const res = await client.query(`
      SELECT u.id, u.name, u.email, r.name as role 
      FROM users u 
      JOIN user_roles ur ON u.id = ur.user_id 
      JOIN roles r ON ur.role_id = r.id 
      WHERE r.name = 'MERCHANT'
    `);
    console.log('Merchants:', res.rows);

    // Check if these merchants have products
    for (const merchant of res.rows) {
      const prodRes = await client.query('SELECT COUNT(*) FROM products WHERE merchant_id = $1', [merchant.id]);
      console.log(`Merchant ${merchant.id} (${merchant.name}) has ${prodRes.rows[0].count} products`);
    }

    // Check recent orders
    const orderRes = await client.query('SELECT COUNT(*) FROM product_orders');
    console.log('Total orders in DB:', orderRes.rows[0].count);

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await client.end();
  }
}

listMerchants();
