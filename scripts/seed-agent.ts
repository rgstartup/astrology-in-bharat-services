import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Agent, AgentStatus } from '../src/modules/agent/domain/entities/agent.entity';

// Load environment variables
dotenv.config();

// Database configuration
const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    entities: [Agent],
    synchronize: true,
});

async function seedAgent() {
    try {
        await AppDataSource.initialize();
        console.log('Database connection established');

        const agentRepo = AppDataSource.getRepository(Agent);

        const email = 'agent@example.com';
        const exists = await agentRepo.findOne({ where: { email } });

        if (!exists) {
            const hashedPassword = await argon2.hash('secure_password');
            const agent = agentRepo.create({
                agent_id: 'AGT-0001',
                name: 'Ramesh Kumar',
                email: email,
                password: hashedPassword,
                phone: '9876543210',
                status: AgentStatus.ACTIVE,
                avatar: 'https://cdn.link/profile.jpg',
                commission_rate: 10,
                address: '123 Main St',
                city: 'Jaipur',
                state: 'Rajasthan',
                aadhaar_no: '123456789012',
                pan_no: 'ABCDE1234F',
            });

            await agentRepo.save(agent);
            console.log('✓ Created test agent: agent@example.com / secure_password');
        } else {
            console.log('✗ Agent already exists: agent@example.com');
        }

        console.log('✓ Agent seeding completed!');
    } catch (error) {
        console.error('Error seeding agent:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

seedAgent();
