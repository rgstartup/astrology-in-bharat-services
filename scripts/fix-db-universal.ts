import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

async function runPatch() {
  console.log('🚀 Starting Universal Database Patch...');
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Database via URL');

    const patches = [
      // Chat Sessions
      { table: 'chat_sessions', column: 'expert_earning', type: 'decimal(10,2) DEFAULT 0' },
      { table: 'chat_sessions', column: 'agent_id', type: 'integer NULL' },
      { table: 'chat_sessions', column: 'agent_commission', type: 'decimal(10,2) DEFAULT 0' },
      { table: 'chat_sessions', column: 'platform_fee', type: 'decimal(10,2) DEFAULT 0' },
      { table: 'chat_sessions', column: 'gst', type: 'decimal(10,2) DEFAULT 0' },

      // Call Sessions
      { table: 'call_sessions', column: 'expert_earning', type: 'decimal(10,2) DEFAULT 0' },
      { table: 'call_sessions', column: 'agent_id', type: 'integer NULL' },
      { table: 'call_sessions', column: 'agent_commission', type: 'decimal(10,2) DEFAULT 0' },
      { table: 'call_sessions', column: 'platform_fee', type: 'decimal(10,2) DEFAULT 0' },
      { table: 'call_sessions', column: 'gst', type: 'decimal(10,2) DEFAULT 0' },

      // Profile Experts
      { table: 'profile_experts', column: 'razorpay_contact_id', type: 'text NULL' },
      { table: 'profile_experts', column: 'total_earning', type: 'decimal(10,2) DEFAULT 0' },
    ];

    for (const patch of patches) {
      try {
        await client.query(`ALTER TABLE "${patch.table}" ADD COLUMN IF NOT EXISTS "${patch.column}" ${patch.type}`);
        console.log(`   ✅ Checked/Added: ${patch.table}.${patch.column}`);
      } catch (e) {
        console.error(`   ❌ Failed for ${patch.table}.${patch.column}:`, e.message);
      }
    }

    console.log('\n🏁 Universal Database Patch Completed!');
  } catch (error) {
    console.error('❌ Patching failed:', error);
  } finally {
    await client.end();
  }
}

runPatch();
