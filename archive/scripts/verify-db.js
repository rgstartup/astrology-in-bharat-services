const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    
    console.log('--- Transactions Table ---');
    const txCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions'");
    console.log(txCols.rows.map(r => r.column_name));
    
    console.log('--- Withdrawals Table ---');
    const wdCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'withdrawals'");
    console.log(wdCols.rows.map(r => r.column_name));
    
    await client.end();
}
check();
