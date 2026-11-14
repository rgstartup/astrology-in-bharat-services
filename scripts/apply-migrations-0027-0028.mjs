import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

async function main() {
  const migrationDir = path.join(process.cwd(), 'drizzle/migrations');
  const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
  
  // Apply only 0027 and 0028
  const targetFiles = files.filter(f => f.startsWith('0027') || f.startsWith('0028'));
  
  console.log(`Applying migrations: ${targetFiles.join(', ')}`);
  
  const client = await pool.connect();
  try {
    for (const file of targetFiles) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      console.log(`\nApplying ${file}...`);
      await client.query(sql);
      console.log(`✓ ${file} applied`);
    }
    console.log('\nAll migrations applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
