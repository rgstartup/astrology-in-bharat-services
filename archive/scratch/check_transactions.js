const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});

async function checkWalletTransactions() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT t.* 
            FROM transactions t
            JOIN wallets w ON t.wallet_id = w.id
            WHERE w.user_id = 102
            ORDER BY t.created_at DESC
        `);
        console.log('Transactions for user 102:', res.rows);
    } catch (err) {
        console.error('Check failed:', err.message);
    } finally {
        await client.end();
    }
}

checkWalletTransactions();
