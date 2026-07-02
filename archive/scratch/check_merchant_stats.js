const { Client } = require('pg');

async function checkStats(userId) {
  const connectionString = 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    const totalOrdersResult = await client.query(`
      SELECT COUNT(DISTINCT oi.order_id) as count
      FROM order_items oi
      INNER JOIN products p ON oi.product_id = p.id
      WHERE p.merchant_id = $1
    `, [userId]);
    console.log(`Merchant ${userId} Total Orders:`, totalOrdersResult.rows[0].count);

    const productsResult = await client.query(`
      SELECT COUNT(*) as count FROM products WHERE merchant_id = $1
    `, [userId]);
    console.log(`Merchant ${userId} Total Products:`, productsResult.rows[0].count);

    const earningsResult = await client.query(`
      SELECT SUM(oi.price * oi.quantity) as sum
      FROM order_items oi
      INNER JOIN products p ON oi.product_id = p.id
      WHERE p.merchant_id = $1
    `, [userId]);
    console.log(`Merchant ${userId} Total Earnings:`, earningsResult.rows[0].sum);

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await client.end();
  }
}

checkStats(115);
