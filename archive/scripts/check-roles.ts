
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: 'd:/live/astrology-in-bharat-services/.env' });

async function checkRoles() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to DB');
        const res = await client.query('SELECT * FROM roles');
        console.log('Roles in DB:', res.rows);

        // Check if 'agent' exists, if not, create it
        const agentRole = res.rows.find(r => r.name.toLowerCase() === 'agent');
        if (!agentRole) {
            console.log("Agent role missing! Creating it...");
            await client.query("INSERT INTO roles (name, description) VALUES ('agent', 'Agent Role')");
            console.log("Agent role created.");
        }

        const rolesAfter = await client.query('SELECT * FROM roles');
        console.log('Roles after check:', rolesAfter.rows);

    } catch (err) {
        console.error('Error connecting to DB:', err);
    } finally {
        await client.end();
    }
}

checkRoles();
