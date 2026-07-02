import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { getErrorMessage } from '@/common/utils/get-error-message.util';
dotenv.config();

async function patchUsersTable() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
        console.log('🚀 Patching "users" table...');
        
        const commands = [
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS password text',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS uid varchar(255) UNIQUE',
        ];

        for (const cmd of commands) {
            try {
                await client.query(cmd);
                console.log(`✅ Executed: ${cmd}`);
            } catch (err) {
                console.log(`⚠️  Already exists or error: ${cmd} - ${getErrorMessage(err)}`);
            }
        }
        
        console.log('🏁 Patching completed.');
    } catch (err) {
        console.error('❌ Patching failed:', err);
    } finally {
        await client.end();
    }
}
patchUsersTable();
