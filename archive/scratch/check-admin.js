const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function checkAdmin() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    await client.connect();

    try {
        const res = await client.query(`
            SELECT u.id, u.email, u.name, r.name as role
            FROM public.users u
            JOIN public.user_roles ur ON u.id = ur.user_id
            JOIN public.roles r ON ur.role_id = r.id
            WHERE r.name = 'admin'
        `);

        if (res.rows.length > 0) {
            console.log('Admin users found:');
            console.table(res.rows);
        } else {
            console.log('No admin users found.');
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkAdmin();
