const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log("Connected to DB.");

        const schemas = [
            'public', 'auth', 'client', 'expert', 'merchant', 'agent', 
            'finance', 'support', 'admin', 'consultations', 'commerce', 'content'
        ];

        for (const schema of schemas) {
            console.log(`Dropping schema ${schema} CASCADE...`);
            await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
            console.log(`Creating schema ${schema}...`);
            await client.query(`CREATE SCHEMA "${schema}";`);
        }

        console.log("All schemas wiped and recreated cleanly.");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
