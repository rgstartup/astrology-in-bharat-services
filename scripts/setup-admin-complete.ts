import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as argon2 from 'argon2';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function setupAdmin(email: string) {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Get or create Admin Role
        const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', ['admin']);
        let adminRoleId;
        if (roleRes.rows.length === 0) {
            const insertRole = await client.query(
                'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id',
                ['admin', 'Administrator role']
            );
            adminRoleId = insertRole.rows[0].id;
            console.log('Created Admin role');
        } else {
            adminRoleId = roleRes.rows[0].id;
        }

        // 2. Check if user exists
        const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        let userId;

        if (userRes.rows.length === 0) {
            console.log(`User ${email} not found. Creating new account...`);
            const hashedPassword = await argon2.hash('Admin@123');
            const insertUser = await client.query(
                `INSERT INTO users (email, password, role, "emailVerified", name, "signinBy") 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [email, hashedPassword, 'admin', true, 'Admin User', 'email&password']
            );
            userId = insertUser.rows[0].id;
            console.log('Created new User account');
        } else {
            userId = userRes.rows[0].id;
            console.log(`User ${email} found. Updating role...`);
            await client.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', userId]);
        }

        // 3. Ensure role link in user_roles
        const linkRes = await client.query(
            'SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2',
            [userId, adminRoleId]
        );

        if (linkRes.rows.length === 0) {
            await client.query(
                'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
                [userId, adminRoleId]
            );
            console.log('Linked user to admin role');
        }

        console.log(`\n✓ DONE: ${email} is now an ADMIN.`);
        console.log(`Default Password: Admin@123 (Please change it immediately after login)\n`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

setupAdmin('prince3328july@gmail.com');
