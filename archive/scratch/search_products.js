const { Client } = require('pg');

async function searchProducts() {
  const connectionString = 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    const res = await client.query("SELECT id, name, merchant_id FROM products WHERE name ILIKE '%prince%' OR name ILIKE '%patel%'");
    console.log('Results:', res.rows);

  } catch (err) {
    console.error('Search failed:', err);
  } finally {
    await client.end();
  }
}

searchProducts();
