import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Use DATABASE_URL from .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("Error: DATABASE_URL not found in .env");
    process.exit(1);
}

async function promoteToAdmin(email: string) {
    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Find user and admin role
        const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.error(`User with email ${email} not found`);
            return;
        }
        const userId = userRes.rows[0].id;

        const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', ['admin']);
        let adminRoleId;
        if (roleRes.rows.length === 0) {
            console.log('Admin role not found, creating it...');
            const insertRoleRes = await client.query(
                'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id',
                ['admin', 'Administrator role']
            );
            adminRoleId = insertRoleRes.rows[0].id;
        } else {
            adminRoleId = roleRes.rows[0].id;
        }

        // 2. Start transaction
        await client.query('BEGIN');

        // 3. Update role column in users table
        await client.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', userId]);

        // 4. Link in user_roles table
        // Check if link exists
        const linkRes = await client.query(
            'SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2',
            [userId, adminRoleId]
        );

        if (linkRes.rows.length === 0) {
            await client.query(
                'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
                [userId, adminRoleId]
            );
            console.log('Linked user to admin role in user_roles table');
        }

        await client.query('COMMIT');
        console.log(`\n✓ SUCCESS: User ${email} (ID: ${userId}) promoted to ADMIN.\n`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during promotion:', err);
    } finally {
        await client.end();
    }
}

promoteToAdmin('prince3328july@gmail.com');
