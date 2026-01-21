const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL is missing in .env');
        return;
    }

    // Remove pgbouncer=true if it causes issues for DDL
    const ddlConnectionString = connectionString.replace('pgbouncer=true', '');

    const client = new Client({
        connectionString: ddlConnectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        console.log('Checking columns for profile_experts...');
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'profile_experts';
    `);

        const columns = res.rows.map(r => r.column_name);
        console.log('Columns found:', columns);

        if (!columns.includes('video')) {
            console.log('Adding "video" column...');
            await client.query('ALTER TABLE "profile_experts" ADD COLUMN "video" text;');
            console.log('Column "video" added successfully!');
        } else {
            console.log('Column "video" already exists.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
