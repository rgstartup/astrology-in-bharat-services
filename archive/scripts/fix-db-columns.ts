import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: false,
});

async function runPatch() {
  console.log('🚀 Starting Database Patch...');
  try {
    await dataSource.initialize();
    console.log('✅ Connected to Database');

    const queryRunner = dataSource.createQueryRunner();

    // Tables to patch
    const tables = ['chat_sessions', 'call_sessions'];

    for (const table of tables) {
      console.log(`\n📦 Patching table: ${table}`);

      const columnsToAdd = [
        { name: 'expert_earning', type: 'decimal(10,2)', default: '0' },
        { name: 'agent_id', type: 'integer', nullable: true },
        { name: 'agent_commission', type: 'decimal(10,2)', default: '0' },
        { name: 'platform_fee', type: 'decimal(10,2)', default: '0' },
        { name: 'gst', type: 'decimal(10,2)', default: '0' },
      ];

      for (const col of columnsToAdd) {
        try {
          await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type} ${col.nullable ? 'NULL' : 'NOT NULL DEFAULT ' + col.default}`);
          console.log(`   ✅ Added/Verified column: ${col.name}`);
        } catch (e) {
          console.log(`   ⚠️ Column ${col.name} might already exist or error: ${e.message}`);
        }
      }
    }

    await dataSource.destroy();
    console.log('\n🏁 Database Patch Completed Successfully!');
  } catch (error) {
    console.error('❌ Patch Failed:', error);
    process.exit(1);
  }
}

runPatch();
