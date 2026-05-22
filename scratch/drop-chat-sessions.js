const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log("Connected to DB.");

        // We will drop the chat_sessions table so TypeORM can recreate it
        await client.query(`DROP TABLE IF EXISTS "consultations"."chat_sessions" CASCADE;`);
        console.log("Dropped old chat_sessions table successfully.");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
