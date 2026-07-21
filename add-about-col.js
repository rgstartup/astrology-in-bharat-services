const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_a3hdzb7leXnF@ep-dark-snow-atxxy0vr-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function run() {
  await client.connect();
  try {
    await client.query('ALTER TABLE expert.profile ADD COLUMN about TEXT;');
    console.log('Column about added successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
