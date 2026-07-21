const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_a3hdzb7leXnF@ep-dark-snow-atxxy0vr-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require',
  });
  
  await client.connect();
  
  try {
    await client.query(`ALTER TABLE "expert"."profile" ADD COLUMN IF NOT EXISTS "about" text`);
    await client.query(`ALTER TABLE "expert"."profile" ADD COLUMN IF NOT EXISTS "about_hi" text`);
    console.log("Columns added successfully.");
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

run();
