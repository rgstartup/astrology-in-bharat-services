import { Client } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config();

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = '123456';
const ADMIN_NAME = 'Admin';

async function seedAdmin() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    await client.connect();

    try {
        // 1. Ensure 'admin' role exists
        let roleRes = await client.query("SELECT id FROM roles WHERE name = 'admin'");
        let roleId: number;

        if (roleRes.rows.length === 0) {
            const insertRole = await client.query(
                "INSERT INTO roles (name, description) VALUES ('admin', 'Administrator') RETURNING id",
            );
            roleId = insertRole.rows[0].id;
            console.log('✅ Created "admin" role (id:', roleId, ')');
        } else {
            roleId = roleRes.rows[0].id;
            console.log('ℹ️  "admin" role already exists (id:', roleId, ')');
        }

        // 2. Check if admin user already exists
        const userRes = await client.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);

        if (userRes.rows.length > 0) {
            const userId = userRes.rows[0].id;

            // Check if user already has admin role
            const userRoleRes = await client.query(
                'SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2',
                [userId, roleId],
            );

            if (userRoleRes.rows.length === 0) {
                await client.query(
                    'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
                    [userId, roleId],
                );
                console.log('✅ Added "admin" role to existing user (id:', userId, ')');
            } else {
                console.log('ℹ️  Admin user already exists with admin role');
            }
            return;
        }

        // 3. Hash the password
        const hashedPassword = await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id });

        // 4. Create the admin user
        const insertUser = await client.query(
            `INSERT INTO users (email, password, name, email_verified_at, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW(), NOW())
             RETURNING id`,
            [ADMIN_EMAIL, hashedPassword, ADMIN_NAME],
        );
        const userId = insertUser.rows[0].id;

        // 5. Assign admin role
        await client.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
            [userId, roleId],
        );

        console.log('');
        console.log('✅ Admin user created successfully!');
        console.log(`   ID:       ${userId}`);
        console.log(`   Email:    ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
        console.log('');

    } catch (error) {
        console.error('❌ Error seeding admin:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

seedAdmin().catch(console.error);
