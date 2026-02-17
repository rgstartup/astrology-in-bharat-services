const { Client } = require('pg');

// Using the connection string from debug_db.js but ensuring port matches (6543 from .env seen earlier, or 5432 from debug_db.js - debug_db.js has 5432, let's try that first as it worked previously)
const connectionString = "postgresql://postgres:rH%2F%238m7ngwc.iLn@db.qooqffzykahvvoszaivj.supabase.co:5432/postgres";

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

console.log('Connecting to DB...');

async function checkAdmins() {
    try {
        await client.connect();
        console.log('Connected.');

        // 1. Check table structure first to be safe
        const schemaRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        // console.log('User Table Columns:', schemaRes.rows.map(r => r.column_name));

        // 2. Query for admins
        // Assuming 'role' column or 'roles' column. Adjust query based on likely column names.
        // We will select id, name, email, role, roles
        const res = await client.query(`
            SELECT id, name, email, role, roles 
            FROM users 
            WHERE 
                role = 'admin' OR 
                role = 'ADMIN' OR
                roles::text ILIKE '%admin%'
        `);

        if (res.rows.length === 0) {
            console.log('No admin users found.');
        } else {
            console.log('Admin Users Found:');
            console.table(res.rows);
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkAdmins();
