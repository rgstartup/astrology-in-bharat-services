import { createConnection } from 'typeorm';
import { User } from '../../src/modules/users/infrastructure/persistence/entities/user.entity';
import { AgentProfile } from '../../src/modules/agent/infrastructure/entities/agent-profile.entity';
import { Session } from '../../src/modules/auth/infrastructure/persistence/entities/session.entity';
import { OAuthAccount } from '../../src/modules/auth/infrastructure/persistence/entities/oauth-accounts.entity';
import { UsedTokens } from '../../src/modules/auth/infrastructure/persistence/entities/used-tokens.entity';
import { ProfileClient } from '../../src/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '../../src/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import * as dotenv from 'dotenv';

dotenv.config();

async function seedAgent() {
    const connection = await createConnection({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [User, Role, AgentProfile, Session, OAuthAccount, UsedTokens, ProfileClient, ProfileExpert],
        ssl: true,
        extra: {
            ssl: {
                rejectUnauthorized: false,
            },
        },
    });

    try {
        const userRepo = connection.getRepository(User);
        const agentRepo = connection.getRepository(AgentProfile);

        const agent = await userRepo.findOne({ where: { email: 'agent@example.com' } });

        if (!agent) {
            console.log('Agent user not found');
            return;
        }

        const existingProfile = await agentRepo.findOne({ where: { user_id: agent.id } });
        if (!existingProfile) {
            const profile = new AgentProfile();
            profile.user_id = agent.id;
            profile.total_earnings = 12500.50;
            profile.total_registrations = 5;
            profile.commission_rate = 15;
            profile.bank_name = 'HDFC Bank';
            profile.account_number = '50100234567890';
            profile.ifsc_code = 'HDFC0001234';
            await agentRepo.save(profile);
            console.log('Agent profile seeded for agent@example.com');
        } else {
            console.log('Agent profile already exists');
        }

    } finally {
        await connection.close();
    }
}

seedAgent().catch(console.error);
