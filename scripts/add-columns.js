const { Client } = require('pg');
require('dotenv').config();

async function addColumns() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('Database connected');

    try {
        console.log('Adding transaction_no to transactions table...');
        await client.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_no VARCHAR(255) UNIQUE');
        
        console.log('Adding withdrawal_no to withdrawals table...');
        await client.query('ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS withdrawal_no VARCHAR(255) UNIQUE');
        
        console.log('Columns added successfully');
    } catch (err) {
        console.error('Error adding columns:', err.message);
    } finally {
        await client.end();
    }
}

addColumns();
