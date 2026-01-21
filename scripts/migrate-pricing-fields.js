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
        console.log('Current columns:', columns);

        const columnsToAdd = [
            { name: 'chat_price', type: 'float' },
            { name: 'call_price', type: 'float' },
            { name: 'video_call_price', type: 'float' },
            { name: 'custom_services', type: 'json' }
        ];

        for (const col of columnsToAdd) {
            if (!columns.includes(col.name)) {
                console.log(`Adding "${col.name}" column...`);
                // Note: Using "double precision" for float in Postgres
                const pgType = col.type === 'float' ? 'double precision' : 'jsonb';
                await client.query(`ALTER TABLE "profile_experts" ADD COLUMN "${col.name}" ${pgType};`);
                console.log(`Column "${col.name}" added successfully!`);
            } else {
                console.log(`Column "${col.name}" already exists.`);
            }
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
