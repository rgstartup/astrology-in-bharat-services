import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

const url = process.env.DATABASE_URL;

async function inspectSchema() {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Database');

    const tables = ['chat_sessions', 'profile_experts', 'call_sessions'];

    for (const table of tables) {
      console.log(`\n📊 Columns in "${table}":`);
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
        ORDER BY column_name;
      `);
      res.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    }

  } catch (error) {
    console.error('❌ Inspection failed:', error);
  } finally {
    await client.end();
  }
}

inspectSchema();
