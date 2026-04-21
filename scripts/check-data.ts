import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

const url = process.env.DATABASE_URL;

async function checkLatestSession() {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Database');

    console.log('\n📊 Latest Chat Session Details:');
    const res = await client.query(`
      SELECT id, total_cost, platform_fee, gst, expert_earning, status, created_at 
      FROM public.chat_sessions 
      ORDER BY created_at DESC 
      LIMIT 1;
    `);
    
    if (res.rows.length > 0) {
      const row = res.rows[0];
      console.log(`- ID: ${row.id}`);
      console.log(`- Total Paid: ${row.total_cost}`);
      console.log(`- Platform Fee: ${row.platform_fee}`);
      console.log(`- GST: ${row.gst}`);
      console.log(`- Expert Earning: ${row.expert_earning}`);
      console.log(`- Status: ${row.status}`);
      console.log(`- Date: ${row.created_at}`);

      const totalCut = Number(row.platform_fee) + Number(row.gst);
      const percentage = (totalCut / Number(row.total_cost)) * 100;
      console.log(`\n📈 Analysis:`);
      console.log(`- Total Platform Cut: ${totalCut}`);
      console.log(`- Actual Percentage: ${percentage.toFixed(2)}%`);
    } else {
      console.log('❌ No sessions found.');
    }

  } catch (error) {
    console.error('❌ Data check failed:', error);
  } finally {
    await client.end();
  }
}

checkLatestSession();
