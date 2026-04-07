import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function fixSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const checkConsultationId = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='support_disputes' AND column_name='consultation_id';
    `);

    if (checkConsultationId.rowCount === 0) {
      console.log('Adding consultation_id column...');
      await client.query('ALTER TABLE support_disputes ADD COLUMN consultation_id INTEGER;');
    }

    const checkPujaId = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='support_disputes' AND column_name='puja_id';
    `);

    if (checkPujaId.rowCount === 0) {
      console.log('Adding puja_id column...');
      await client.query('ALTER TABLE support_disputes ADD COLUMN puja_id INTEGER;');
    }

    const checkOrderId = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='support_disputes' AND column_name='order_id';
    `);

    if (checkOrderId.rowCount === 0) {
      console.log('Adding order_id column...');
      await client.query('ALTER TABLE support_disputes ADD COLUMN order_id INTEGER;');
    }
    
    console.log('Schema update check complete');
    await client.end();
  } catch (err) {
    console.error('Error fixing schema:', err);
  }
}

fixSchema();
