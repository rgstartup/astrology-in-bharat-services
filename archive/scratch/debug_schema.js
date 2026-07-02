const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});

async function debugSchema() {
    try {
        await client.connect();
        
        console.log('--- TABLES ---');
        const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%agent_profile%'");
        console.log(tables.rows);

        for (let row of tables.rows) {
            console.log(`--- COLUMNS FOR ${row.table_name} ---`);
            const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${row.table_name}'`);
            console.log(cols.rows.map(c => c.column_name));
        }

    } catch (err) {
        console.error('Debug failed:', err.message);
    } finally {
        await client.end();
    }
}

debugSchema();
