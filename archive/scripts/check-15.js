const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    const res = await client.query('SELECT id, withdrawal_no FROM withdrawals WHERE id = 15');
    console.log(res.rows);
    await client.end();
}
check();
