const { Client } = require('pg');

async function checkEnums() {
  const connectionString = 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    const res = await client.query(`
      SELECT n.nspname AS schema, t.typname AS name, e.enumlabel AS value 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      JOIN pg_namespace n ON n.oid = t.typnamespace 
      WHERE t.typname = 'product_orders_status_enum'
    `);
    console.log('OrderStatus enum values:', res.rows.map(r => r.value));

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await client.end();
  }
}

checkEnums();
