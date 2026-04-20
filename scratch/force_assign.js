const { Client } = require('pg');

async function forceAssign() {
  const connectionString = 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    // Assign product 19 to merchant 118
    const res = await client.query('UPDATE products SET merchant_id = 118 WHERE id = 19');
    console.log('Update result:', res.rowCount, 'rows updated');

  } catch (err) {
    console.error('Update failed:', err);
  } finally {
    await client.end();
  }
}

forceAssign();
