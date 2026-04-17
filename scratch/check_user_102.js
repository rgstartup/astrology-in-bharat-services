const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});

async function checkAgentProfile() {
    try {
        await client.connect();
        const res = await client.query('SELECT * FROM agent_profiles WHERE user_id = 102');
        if (res.rows.length === 0) {
            console.log('No profile found for user 102. Creating one...');
            await client.query('INSERT INTO agent_profiles (user_id, total_earnings, total_registrations, commission_rate) VALUES (102, 0, 0, 10.00)');
            console.log('Profile created for user 102.');
        } else {
            console.log('Profile already exists for user 102:', res.rows[0]);
        }
    } catch (err) {
        console.error('Check failed:', err.message);
    } finally {
        await client.end();
    }
}

checkAgentProfile();
