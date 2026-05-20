const { Client } = require('pg');

async function checkWallets() {
  const connectionString = 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    // Find all wallets and list them
    const res = await client.query('SELECT user_id, balance, reserved_balance FROM wallets WHERE balance > 0 OR reserved_balance > 0 LIMIT 10');
    console.log('Wallets with balance:', res.rows);

    // Find any transactions
    const txnRes = await client.query('SELECT wallet_id, amount, type, purpose FROM transactions LIMIT 10');
    console.log('Recent transactions:', txnRes.rows);

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await client.end();
  }
}

checkWallets();
