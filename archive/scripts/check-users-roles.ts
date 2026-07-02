
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'd:/live/astrology-in-bharat-services/.env' });

async function checkUsers() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
      SELECT u.id, u.email, u.name, array_agg(r.name) as current_roles
      FROM users u
      LEFT JOIN user_roles ur ON ur."user_id" = u.id
      LEFT JOIN roles r ON r.id = ur."role_id"
      GROUP BY u.id, u.email, u.name
      LIMIT 10
    `);
        console.log('Users and their roles:', JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkUsers();
