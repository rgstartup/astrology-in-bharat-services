import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Address } from '../src/common/domain/entities/address.entity';
import { Credential } from '../src/modules/auth/domain/entities/credential.entity';
import { OAuthAccount } from '../src/modules/auth/domain/entities/oauth-accounts.entity';
import { UsedTokens } from '../src/modules/auth/domain/entities/used-tokens.entity';
import { ProfileClient } from '../src/modules/client/domain/entities/profile-client.entity';
import { ProfileExpert } from '../src/modules/expert/domain/entities/profile-expert.entity';
import { Role } from '../src/modules/role/domain/entities/roles.entity';
import { User } from '../src/modules/users/domain/entities/user.entity';

// Load environment variables
dotenv.config();

// Database configuration
const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'astrology_bharat',
    ssl: process.env.DB_SSL !== 'false',
    entities: [
        User,
        Role,
        ProfileClient,
        ProfileExpert,
        Address,
        OAuthAccount,
        Credential,
        UsedTokens,
    ],
    synchronize: false,
    logging: true,
});

async function makeAdmin(email: string) {
    try {
        await AppDataSource.initialize();
        console.log('Database connection established');

        const userRepo = AppDataSource.getRepository(User);
        const roleRepo = AppDataSource.getRepository(Role);

        // 1. Find the user
        const user = await userRepo.findOne({
            where: { email },
            relations: ['roles']
        });

        if (!user) {
            console.error(`Error: User with email ${email} not found.`);
            return;
        }

        // 2. Find or create admin role
        let adminRole = await roleRepo.findOne({ where: { name: 'admin' } });
        if (!adminRole) {
            adminRole = roleRepo.create({ name: 'admin', description: 'Administrator role' });
            await roleRepo.save(adminRole);
            console.log('Created admin role');
        }

        // 3. Promote user
        user.role = 'admin';

        // Check if user already has the admin role
        const hasAdminRole = user.roles.some(r => r.name === 'admin');
        if (!hasAdminRole) {
            user.roles.push(adminRole);
        }

        await userRepo.save(user);
        console.log(`\n✓ SUCCESS: User ${email} has been promoted to ADMIN.\n`);

    } catch (error) {
        console.error('Error promoting user:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

const targetEmail = 'prince3328july@gmail.com';
makeAdmin(targetEmail);
