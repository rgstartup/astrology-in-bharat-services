import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users';
import { Role } from '../src/modules/role/entities/roles.entity';
import { ProfileClient } from '../src/modules/client/profile/entities/profile-client.entity';
import { ProfileExpert } from '../src/modules/expert/profile/entities/profile-expert.entity';
import { Address } from '../src/common/entities/address.entity';
import { OAuthAccount } from '../src/modules/auth/entities/oauth-accounts.entity';
import { Credential } from '../src/modules/auth/entities/credential.entity';
import { UsedTokens } from '../src/modules/auth/entities/used-tokens.entity';
import * as argon2 from 'argon2';

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
  ssl: process.env.DB_SSL !== 'false', // Enable SSL for Neon
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

async function seedUsers() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established');

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);

    // Get or create expert role
    let expertRole = await roleRepo.findOne({ where: { name: 'expert' } });
    if (!expertRole) {
      expertRole = roleRepo.create({ name: 'expert' });
      await roleRepo.save(expertRole);
      console.log('Created expert role');
    }

    const dummyUsers = [
      {
        email: 'john.expert@example.com',
        name: 'John Smith',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'sarah.expert@example.com',
        name: 'Sarah Johnson',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'mike.expert@example.com',
        name: 'Mike Davis',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'emma.expert@example.com',
        name: 'Emma Wilson',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'david.expert@example.com',
        name: 'David Brown',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'lisa.expert@example.com',
        name: 'Lisa Anderson',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'james.expert@example.com',
        name: 'James Miller',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'susan.expert@example.com',
        name: 'Susan Taylor',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'robert.expert@example.com',
        name: 'Robert Martinez',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'patricia.expert@example.com',
        name: 'Patricia Garcia',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'christopher.expert@example.com',
        name: 'Christopher Lee',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'jennifer.expert@example.com',
        name: 'Jennifer White',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'daniel.expert@example.com',
        name: 'Daniel Harris',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'jessica.expert@example.com',
        name: 'Jessica Clark',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'thomas.expert@example.com',
        name: 'Thomas Lewis',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'linda.expert@example.com',
        name: 'Linda Walker',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'matthew.expert@example.com',
        name: 'Matthew Young',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'mary.expert@example.com',
        name: 'Mary King',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'andrew.expert@example.com',
        name: 'Andrew Wright',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'nancy.expert@example.com',
        name: 'Nancy Lopez',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'ryan.expert@example.com',
        name: 'Ryan Hill',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'betty.expert@example.com',
        name: 'Betty Scott',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'kevin.expert@example.com',
        name: 'Kevin Green',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'carol.expert@example.com',
        name: 'Carol Adams',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'edward.expert@example.com',
        name: 'Edward Nelson',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'sandra.expert@example.com',
        name: 'Sandra Carter',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'brian.expert@example.com',
        name: 'Brian Roberts',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'ashley.expert@example.com',
        name: 'Ashley Phillips',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'paul.expert@example.com',
        name: 'Paul Campbell',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'kathleen.expert@example.com',
        name: 'Kathleen Parker',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'marie.expert@example.com',
        name: 'Marie Ortiz',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'george.expert@example.com',
        name: 'George Simmons',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'olivia.expert@example.com',
        name: 'Olivia Brooks',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'nicholas.expert@example.com',
        name: 'Nicholas Reed',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
      {
        email: 'veronica.expert@example.com',
        name: 'Veronica Price',
        password: await argon2.hash('password123'),
        emailVerified: true,
      },
    ];

    const existingUsers = await userRepo.find();
    console.log(`Found ${existingUsers.length} existing users`);

    for (const userData of dummyUsers) {
      const exists = await userRepo.findOne({ where: { email: userData.email } });
      if (!exists) {
        const user = userRepo.create(userData);
        user.roles = [expertRole];
        await userRepo.save(user);
        console.log(`✓ Created user: ${userData.email}`);
      } else {
        console.log(`✗ User already exists: ${userData.email}`);
      }
    }

    console.log('✓ User seeding completed!');
  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

seedUsers();

