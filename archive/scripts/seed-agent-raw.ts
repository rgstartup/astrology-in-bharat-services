import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function seedAgentRaw() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    await client.connect();

    try {
        const agentEmail = 'agent@example.com';
        const res = await client.query('SELECT id FROM users WHERE email = $1', [agentEmail]);

        if (res.rows.length === 0) {
            console.log('Agent user not found');
            return;
        }

        const agentId = res.rows[0].id;

        // Check if profile exists
        const profileRes = await client.query('SELECT id FROM agent_profiles WHERE user_id = $1', [agentId]);

        if (profileRes.rows.length === 0) {
            await client.query(`
                INSERT INTO agent_profiles 
                (user_id, total_earnings, total_registrations, commission_rate, bank_name, account_number, ifsc_code, created_at, updated_at)
                VALUES 
                ($1, 15420.75, 12, 10.00, 'HDFC Bank', '50100456237890', 'HDFC0001234', NOW(), NOW())
            `, [agentId]);
            console.log('Agent profile seeded via raw SQL');
        } else {
            console.log('Agent profile already exists');
        }

        // Link some existing users to this agent for stats
        // Let's link user 41 (Monu AI) and 43 (Prince Patel) and 45, 46
        const usersToLink = [41, 43, 45, 46];
        await client.query('UPDATE users SET referred_by_id = $1 WHERE id = ANY($2)', [agentId, usersToLink]);
        console.log(`Linked users ${usersToLink.join(', ')} to agent ${agentId}`);

    } finally {
        await client.end();
    }
}

seedAgentRaw().catch(console.error);
