const { Client } = require('pg');

async function testDate() {
    const client = new Client({
        connectionString: 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    });

    try {
        await client.connect();
        const res = await client.query("SELECT TO_CHAR(created_at, 'Mon DD') as date FROM order_items LIMIT 1");
        console.log('DB TO_CHAR:', `"${res.rows[0].date}"`);
        
        const d = new Date();
        const jsDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        console.log('JS localDate:', `"${jsDate}"`);

    } finally {
        await client.end();
    }
}

testDate();
