const { Client } = require('pg');

async function checkDb() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  });

  try {
    await client.connect();
    
    console.log('--- ALL RELEVANT SETTINGS ---');
    const settingsRes = await client.query(`
      SELECT key, value 
      FROM system_settings 
      WHERE key LIKE '%COMMI%_FROM_ASTROLOGER%'
    `);
    settingsRes.rows.forEach(row => {
      console.log('Setting:', row.key, '=', row.value);
    });

    console.log('\n--- EXPERT EARNINGS ---');
    const expertRes = await client.query(`
      SELECT u.name, pe.total_earning 
      FROM users u 
      JOIN profile_experts pe ON u.id = pe.user_id 
      WHERE u.name = 'cekihad'
    `);
    expertRes.rows.forEach(row => {
      console.log('Expert:', row.name, '| Total Earning:', row.total_earning);
    });

    await client.end();
  } catch (err) {
    console.error('DB Error:', err);
  }
}

checkDb();
