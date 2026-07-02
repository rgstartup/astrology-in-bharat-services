import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function run() {
    dotenv.config({ path: path.join(__dirname, '../.env') });
    
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        console.log('Adding column razorpay_contact_id to profile_experts...');
        await client.query('ALTER TABLE "profile_experts" ADD COLUMN IF NOT EXISTS "razorpay_contact_id" text;');

        console.log('Adding column razorpay_fund_account_id to expert_bank_accounts...');
        await client.query('ALTER TABLE "expert_bank_accounts" ADD COLUMN IF NOT EXISTS "razorpay_fund_account_id" text;');

        console.log('Schema update complete.');
    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        await client.end();
    }
}

run();
