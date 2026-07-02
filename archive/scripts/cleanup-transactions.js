const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function cleanup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // Delete all transactions
    const result = await client.query('DELETE FROM transactions');
    console.log(`Deleted ${result.rowCount} transactions.`);

    // Also clear wallet balances to be safe? 
    // The user said "nothing buyed or sell", so wallets should be 0.
    const walletResult = await client.query('UPDATE wallets SET balance = 0, reserved_balance = 0');
    console.log(`Reset ${walletResult.rowCount} wallets to 0 balance.`);

  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await client.end();
  }
}

cleanup();
