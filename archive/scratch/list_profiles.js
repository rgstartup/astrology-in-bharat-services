const { Client } = require('pg');

async function checkProfiles() {
  const connectionString = 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    const res = await client.query('SELECT * FROM profile_merchants');
    console.log('Profiles:', res.rows.map(r => ({ user_id: r.user_id, id: r.id, shopName: r.shopName })));

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await client.end();
  }
}

checkProfiles();
