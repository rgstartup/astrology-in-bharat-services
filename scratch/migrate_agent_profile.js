const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const columns = [
            { name: 'bank_name', type: 'varchar(255)' },
            { name: 'account_number', type: 'varchar(255)' },
            { name: 'ifsc_code', type: 'varchar(255)' },
            { name: 'account_holder', type: 'varchar(255)' },
            { name: 'phone', type: 'varchar(255)' },
            { name: 'address', type: 'text' },
            { name: 'city', type: 'varchar(255)' },
            { name: 'state', type: 'varchar(255)' },
            { name: 'aadhaar_no', type: 'varchar(255)' },
            { name: 'pan_no', type: 'varchar(255)' },
            { name: 'aadhaar_doc', type: 'varchar(255)' },
            { name: 'pan_doc', type: 'varchar(255)' },
        ];

        for (const col of columns) {
            try {
                await client.query(`ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
                console.log(`Column ${col.name} added/checked.`);
            } catch (err) {
                console.error(`Error adding column ${col.name}:`, err.message);
            }
        }

        console.log('Migration complete');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
