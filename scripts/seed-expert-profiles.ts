import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/role/entities/roles.entity';
import { ProfileClient } from '../src/modules/client/profile/entities/profile-client.entity';
import { ProfileExpert } from '../src/modules/expert/profile/entities/profile-expert.entity';
import { Address, AddressTag } from '../src/common/entities/address.entity';
import { OAuthAccount } from '../src/modules/auth/entities/oauth-accounts.entity';
import { Credential } from '../src/modules/auth/entities/credential.entity';
import { UsedTokens } from '../src/modules/auth/entities/used-tokens.entity';

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

const specializations = [
  'Vedic Astrology',
  'Western Astrology',
  'Numerology',
  'Tarot Reading',
  'Palmistry',
  'Horoscope Reading',
  'Birth Chart Analysis',
  'Zodiac Compatibility',
  'Astrocartography',
  'Lunar Node Analysis',
  'Remedial Astrology',
  'Medical Astrology',
  'Vastu Shastra',
  'Feng Shui',
  'Chakra Healing',
  'Crystal Therapy',
  'Karmic Astrology',
  'Predictive Astrology',
];

const locations = [
  { city: 'Delhi', state: 'Delhi', zipCode: '110001' },
  { city: 'Mumbai', state: 'Maharashtra', zipCode: '400001' },
  { city: 'Bangalore', state: 'Karnataka', zipCode: '560001' },
  { city: 'Pune', state: 'Maharashtra', zipCode: '411001' },
  { city: 'Chennai', state: 'Tamil Nadu', zipCode: '600001' },
  { city: 'Hyderabad', state: 'Telangana', zipCode: '500001' },
  { city: 'Kolkata', state: 'West Bengal', zipCode: '700001' },
  { city: 'Jaipur', state: 'Rajasthan', zipCode: '302001' },
];

const genders = ['male', 'female', 'other'];

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomRating(): number {
  return parseFloat((Math.random() * 5).toFixed(1));
}

const languagesPool = [
  'Hindi',
  'English',
  'Bengali',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Punjabi',
];

function getRandomLanguages(): string[] {
  const count = getRandomNumber(1, 3);
  const chosen: string[] = [];
  while (chosen.length < count) {
    const lang = getRandomItem(languagesPool);
    if (!chosen.includes(lang)) chosen.push(lang);
  }
  return chosen;
}

function getRandomPrice(min = 100, max = 2000): number {
  // Price in rupees (or your app currency); integer
  return getRandomNumber(min, max);
}

async function seedExpertProfiles() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established');

    const userRepo = AppDataSource.getRepository(User);
    const profileRepo = AppDataSource.getRepository(ProfileExpert);
    const addressRepo = AppDataSource.getRepository(Address);

    // Get all users with 'expert' role
    const expertUsers = await userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('roles.name = :roleName', { roleName: 'expert' })
      .getMany();

    console.log(`Found ${expertUsers.length} expert users`);

    const bioTemplates = [
      'Experienced astrologer with 10+ years of practice in vedic and western astrology.',
      'Passionate about helping people understand their destiny through celestial guidance.',
      'Specialized in birth chart analysis and personalized horoscope readings.',
      'Expert in numerology and its application to life guidance and decision making.',
      'Dedicated to providing accurate tarot readings and spiritual guidance.',
      'Certified astrologer offering comprehensive astrological consultations.',
      'Skilled in palmistry with deep understanding of life patterns.',
      'Professional astrologer with expertise in multiple astrological traditions.',
      'Specializing in Vedic astrology with focus on marriage and career predictions.',
      'Expert in lunar cycles and their impact on daily life.',
      'Vastu consultant helping families create harmonious living spaces.',
      'Master of Tarot with 15+ years of reading experience.',
      'Birth chart specialist providing detailed personality and career insights.',
      'Zodiac compatibility expert for couples and relationship guidance.',
      'Remedial astrology practitioner offering solutions to life challenges.',
      'Chakra healing specialist combining astrology with energy work.',
      'Karmic astrology expert helping understand past life connections.',
      'Predictive astrology specialist for major life events and timing.',
    ];

    for (const user of expertUsers) {
      // Check if profile already exists
      const existingProfile = await profileRepo.findOne({
        where: { user: { id: user.id } },
      });

      if (existingProfile) {
        console.log(`✗ Profile already exists for user: ${user.email}`);
        continue;
      }

      // Create profile
      const chosenLangs = getRandomLanguages();
      const profile = profileRepo.create({
        user: { id: user.id },
        gender: getRandomItem(genders) as 'male' | 'female' | 'other',
        specialization: getRandomItem(specializations),
        bio: getRandomItem(bioTemplates),
        experience_in_years: getRandomNumber(1, 25),
        rating: getRandomRating(),
        // store as CSV to match existing entity column (text)
        languages: chosenLangs.join(','),
        // price between 1 and 100 as requested
        price: getRandomPrice(1, 100),
      });

      const savedProfile = await profileRepo.save(profile);

      // Create addresses
      const location = getRandomItem(locations);
      const address = addressRepo.create({
        line1: `${getRandomNumber(1, 999)} ${['MG Road', 'Park Street', 'Main Street', 'High Street', 'Central Avenue'][Math.floor(Math.random() * 5)]}`,
        city: location.city,
        state: location.state,
        country: 'India',
        zipCode: location.zipCode,
        tag: AddressTag.HOME,
        profile_expert: { id: savedProfile.id },
      });

      await addressRepo.save(address);

      console.log(
        `✓ Created profile for ${user.name} (${user.email}) - Specialization: ${profile.specialization}, Experience: ${profile.experience_in_years} years, Rating: ${profile.rating}`,
      );
    }

    console.log('✓ Expert profile seeding completed!');
  } catch (error) {
    console.error('Error seeding expert profiles:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

seedExpertProfiles();
