const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });


    await client.connect();
    console.log('Database connected');

    // 1. Update Withdrawals
    const res = await client.query(`
        SELECT w.id, r.name as role_name 
        FROM withdrawals w
        LEFT JOIN users u ON w.user_id = u.id
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE w.withdrawal_no IS NULL
    `);

    console.log(`Found ${res.rows.length} withdrawals to update`);

    for (const row of res.rows) {
        const rolePart = row.role_name === 'agent' ? 'AGT' : (row.role_name === 'expert' ? 'EXP' : 'USR');
        const withdrawalNo = `AIB-${rolePart}-PAY-${row.id.toString().padStart(6, '0')}`;
        await client.query('UPDATE withdrawals SET withdrawal_no = $1 WHERE id = $2', [withdrawalNo, row.id]);
        console.log(`Updated Withdrawal ID ${row.id} -> ${withdrawalNo}`);
    }

    // 2. Update Transactions
    const txRes = await client.query(`
        SELECT t.id, t.purpose, r.name as role_name 
        FROM transactions t
        LEFT JOIN wallets w ON t.wallet_id = w.id
        LEFT JOIN users u ON w.user_id = u.id
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE t.transaction_no IS NULL
    `);

    console.log(`Found ${txRes.rows.length} transactions to update`);

    for (const row of txRes.rows) {
        const rolePart = row.role_name === 'agent' ? 'AGT' : (row.role_name === 'expert' ? 'EXP' : 'USR');
        let purposePart = 'MISC';
        switch (row.purpose) {
            case 'withdrawal': purposePart = 'PAY'; break;
            case 'recharge': purposePart = 'RECH'; break;
            case 'product_purchase': purposePart = 'ORD'; break;
            case 'consultation': purposePart = 'CONS'; break;
            case 'refund': purposePart = 'REF'; break;
            case 'agent_commission': purposePart = 'COMM'; break;
        }
        const txNo = `AIB-${rolePart}-${purposePart}-${row.id.toString().padStart(6, '0')}`;
        await client.query('UPDATE transactions SET transaction_no = $1 WHERE id = $2', [txNo, row.id]);
        console.log(`Updated Transaction ID ${row.id} -> ${txNo}`);
    }

    await client.end();
    console.log('Migration completed');
}

migrate().catch(err => console.error(err));
