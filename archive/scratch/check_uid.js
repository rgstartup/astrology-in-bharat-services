const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});

async function checkUserUid() {
    try {
        await client.connect();
        const res = await client.query('SELECT id, uid, email FROM users WHERE id = 102');
        console.log('User 102 info:', res.rows[0]);
    } catch (err) {
        console.error('Check failed:', err.message);
    } finally {
        await client.end();
    }
}

checkUserUid();
