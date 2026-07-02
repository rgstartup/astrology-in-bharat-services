const { Client } = require('pg');
require('dotenv').config();

const generateNo = (id, prefix) => {
    return `${prefix}-${String(id).padStart(6, '0')}`;
};

async function masterFix() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // 1. Force add columns (Ignore error if already exists)
        console.log('Force adding columns...');
        try {
            await client.query('ALTER TABLE transactions ADD COLUMN transaction_no VARCHAR(255) UNIQUE');
            console.log('SUCCESS: Added transaction_no to transactions');
        } catch (e) {
            console.log('INFO: transaction_no might already exist or: ' + e.message);
        }

        try {
            await client.query('ALTER TABLE withdrawals ADD COLUMN withdrawal_no VARCHAR(255) UNIQUE');
            console.log('SUCCESS: Added withdrawal_no to withdrawals');
        } catch (e) {
            console.log('INFO: withdrawal_no might already exist or: ' + e.message);
        }

        // 2. Populate Transactions
        console.log('Populating Transaction IDs...');
        const txs = await client.query('SELECT id FROM transactions WHERE transaction_no IS NULL');
        for (const row of txs.rows) {
            const no = generateNo(row.id, 'AIB-TXN');
            await client.query('UPDATE transactions SET transaction_no = $1 WHERE id = $2', [no, row.id]);
        }
        console.log(`Updated ${txs.rows.length} transactions.`);

        // 3. Populate Withdrawals
        console.log('Populating Withdrawal IDs...');
        const wds = await client.query('SELECT id FROM withdrawals WHERE withdrawal_no IS NULL');
        for (const row of wds.rows) {
            const no = generateNo(row.id, 'AIB-AGT-PAY');
            await client.query('UPDATE withdrawals SET withdrawal_no = $1 WHERE id = $2', [no, row.id]);
        }
        console.log(`Updated ${wds.rows.length} withdrawals.`);

        console.log('MASTER FIX COMPLETED SUCCESSFULLY!');

    } catch (err) {
        console.error('CRITICAL ERROR DURING MASTER FIX:', err);
    } finally {
        await client.end();
    }
}

masterFix();
