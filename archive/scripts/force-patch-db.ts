import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

const url = process.env.DATABASE_URL;

async function runForcePatch() {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Database');

    const commands = [
      // Chat Sessions
      'ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS expert_earning decimal(10,2) DEFAULT 0',
      'ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS agent_id integer NULL',
      'ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS agent_commission decimal(10,2) DEFAULT 0',
      'ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS platform_fee decimal(10,2) DEFAULT 0',
      'ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS gst decimal(10,2) DEFAULT 0',

      // Call Sessions
      'ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS expert_earning decimal(10,2) DEFAULT 0',
      'ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS agent_id integer NULL',
      'ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS agent_commission decimal(10,2) DEFAULT 0',
      'ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS platform_fee decimal(10,2) DEFAULT 0',
      'ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS gst decimal(10,2) DEFAULT 0',

      // Profile Experts
      'ALTER TABLE public.profile_experts ADD COLUMN IF NOT EXISTS razorpay_contact_id text NULL',
      'ALTER TABLE public.profile_experts ADD COLUMN IF NOT EXISTS total_earning decimal(10,2) DEFAULT 0',
    ];

    for (const sql of commands) {
      try {
        console.log(`🚀 Executing: ${sql.slice(0, 50)}...`);
        const res = await client.query(sql);
        console.log(`   ✅ Success!`);
      } catch (e) {
        console.error(`   ❌ Failed: ${e.message}`);
      }
    }

    console.log('\n🏁 Force Patch Completed!');

  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    await client.end();
  }
}

runForcePatch();
