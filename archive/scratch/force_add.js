const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});

async function forceAddColumn() {
    try {
        await client.connect();
        console.log('Connected');
        
        // Use double quotes for table name and column name just in case
        await client.query('ALTER TABLE "agent_profiles" ADD COLUMN "account_holder" VARCHAR(255)');
        console.log('Success');
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

forceAddColumn();
