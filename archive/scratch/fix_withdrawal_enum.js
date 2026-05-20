const { Client } = require('pg');

async function checkDatabase() {
  const connectionString = 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    // 1. Check existing values in the enum type
    const enumQuery = `
      SELECT n.nspname AS schema, t.typname AS name, e.enumlabel AS value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'withdrawals_status_enum';
    `;
    const enumRes = await client.query(enumQuery);
    console.log('Current enum values:', enumRes.rows.map(r => r.value));

    // 2. Check if 'approved' is in the enum
    const hasApproved = enumRes.rows.some(r => r.value === 'approved');
    if (!hasApproved) {
      console.log("'approved' value missing from enum. Attempting to add it...");
      try {
        // Enums cannot be altered inside a transaction block in some versions of Postgres, 
        // but let's try ALTER TYPE.
        await client.query("ALTER TYPE withdrawals_status_enum ADD VALUE IF NOT EXISTS 'approved'");
        console.log("Successfully added 'approved' to withdrawals_status_enum");
      } catch (err) {
        console.error("Failed to add 'approved' to enum:", err.message);
      }
    }

    // 3. Check for any records with status 'approved' that might be problematic
    const recordQuery = "SELECT id, status FROM withdrawals WHERE status::text = 'approved'";
    const recordRes = await client.query(recordQuery);
    console.log(`Found ${recordRes.rowCount} records with status 'approved'`);

  } catch (err) {
    console.error('Database check failed:', err);
  } finally {
    await client.end();
  }
}

checkDatabase();
