const { Client } = require('pg');

async function fixEnum() {
  const connectionString = 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    const statusesToAdd = ['completed', 'approved'];

    for (const status of statusesToAdd) {
      try {
        await client.query(`ALTER TYPE withdrawals_status_enum ADD VALUE IF NOT EXISTS '${status}'`);
        console.log(`Successfully added '${status}' to withdrawals_status_enum`);
      } catch (err) {
        console.log(`Skipping '${status}': ${err.message}`);
      }
    }

    // Also check if any rows need status update from 'success' to 'completed'?
    // Let's see how many 'success' rows we have.
    const successRes = await client.query("SELECT COUNT(*) FROM withdrawals WHERE status::text = 'success'");
    console.log(`Found ${successRes.rows[0].count} records with status 'success'`);

  } catch (err) {
    console.error('Fix failed:', err);
  } finally {
    await client.end();
  }
}

fixEnum();
