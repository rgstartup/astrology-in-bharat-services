const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});

async function addAccountHolderColumn() {
    try {
        await client.connect();
        console.log('Connected to DB');
        
        // Add column if it doesn't exist
        await client.query(`
            ALTER TABLE agent_profiles 
            ADD COLUMN IF NOT EXISTS account_holder VARCHAR(255);
        `);
        console.log('Column account_holder added successfully to agent_profiles');
        
    } catch (err) {
        console.error('Failed to add column:', err.message);
    } finally {
        await client.end();
    }
}

addAccountHolderColumn();
