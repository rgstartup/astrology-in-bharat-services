import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkUser() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
        const res = await client.query('SELECT * FROM users WHERE email = $1', ['admin@gmail.com']);
        console.log('User details:', res.rows[0]);
        
        const roles = await client.query(`
            SELECT r.name 
            FROM roles r 
            JOIN user_roles ur ON ur.role_id = r.id 
            WHERE ur.user_id = $1`, [res.rows[0].id]);
        console.log('User roles:', roles.rows.map(r => r.name));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
checkUser();
