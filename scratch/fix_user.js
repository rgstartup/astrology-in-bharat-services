const { Client } = require('pg');

async function fixUser() {
    const client = new Client({
        connectionString: 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    });

    try {
        await client.connect();
        console.log('Connected to Neon DB');

        const email = 'secetel851@azucore.com';
        const res = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (res.rows.length === 0) {
            console.log('User not found');
            return;
        }

        const userId = res.rows[0].id;
        console.log(`User ID: ${userId}`);

        const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', ['merchant']);
        if (roleRes.rows.length === 0) {
            console.log('Merchant role not found');
            return;
        }

        const roleId = roleRes.rows[0].id;
        console.log(`Merchant Role ID: ${roleId}`);

        await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, roleId]);
        console.log('Merchant role assigned to user');

        // Also ensure the merchant profile exists and is active
        const profileRes = await client.query('SELECT * FROM profile_merchants WHERE user_id = $1', [userId]);
        if (profileRes.rows.length === 0) {
            console.log('Creating merchant profile...');
            await client.query('INSERT INTO profile_merchants (user_id, status, "shopName") VALUES ($1, $2, $3)', [userId, 'active', 'Azucore Shop']);
            console.log('Merchant profile created');
        } else {
            console.log('Updating merchant profile status to active...');
            await client.query('UPDATE profile_merchants SET status = $1 WHERE user_id = $2', ['active', userId]);
            console.log('Merchant profile updated');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fixUser();
