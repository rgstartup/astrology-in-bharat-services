import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function countUsers() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query('SELECT COUNT(*) FROM users');
        console.log('Total Users:', res.rows[0].count);

        const roles = await client.query('SELECT name FROM roles');
        console.log('Roles found:', roles.rows.map(r => r.name));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

countUsers();
