import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '@/modules/users/entities/user.entity';
import { RoleEnum } from '@/modules/users/enums/Role.enum';
import { PlatformEnum } from '@/modules/users/enums/Platform.enum';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { Wallet } from '@/modules/finance/wallet/entities/wallet.entity';

interface ClientSeedData {
  user: {
    email: string;
    firstName: string;
    lastName: string;
    name: string;
    fullName: string;
  };
  account: {
    firstName: string;
    lastName: string;
    name: string;
    phone: string;
    gender: 'male' | 'female' | 'other';
    dateOfBirth: Date;
    timeOfBirth: string;
    placeOfBirth: string;
    languagePreference: string;
    maritalStatus: string;
    occupation: string;
    aboutMe: string;
  };
  walletBalance: number;
}

export class ClientSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const accountRepository = dataSource.getRepository(ClientAccount);
    const walletRepository = dataSource.getRepository(Wallet);

    const defaultPassword = process.env.CLIENT_SEED_PASSWORD || 'Client@123456';
    const hashedPassword = await argon2.hash(defaultPassword, {
      type: argon2.argon2id,
    });

    const clients: ClientSeedData[] = [
      {
        user: {
          email: 'aarav.mehta@example.com',
          firstName: 'Aarav',
          lastName: 'Mehta',
          name: 'Aarav Mehta',
          fullName: 'Aarav Mehta',
        },
        account: {
          firstName: 'Aarav',
          lastName: 'Mehta',
          name: 'Aarav Mehta',
          phone: '+917701234567',
          gender: 'male',
          dateOfBirth: new Date('1995-03-14'),
          timeOfBirth: '06:30 AM',
          placeOfBirth: 'Mumbai, Maharashtra',
          languagePreference: 'Hindi',
          maritalStatus: 'single',
          occupation: 'Software Engineer',
          aboutMe:
            'Curious about astrology and its connection to my career growth and life decisions.',
        },
        walletBalance: 500,
      },
      {
        user: {
          email: 'prerna.sharma@example.com',
          firstName: 'Prerna',
          lastName: 'Sharma',
          name: 'Prerna Sharma',
          fullName: 'Prerna Sharma',
        },
        account: {
          firstName: 'Prerna',
          lastName: 'Sharma',
          name: 'Prerna Sharma',
          phone: '+917701234568',
          gender: 'female',
          dateOfBirth: new Date('1990-07-22'),
          timeOfBirth: '11:15 AM',
          placeOfBirth: 'Jaipur, Rajasthan',
          languagePreference: 'Hindi',
          maritalStatus: 'married',
          occupation: 'Teacher',
          aboutMe:
            "Seeking guidance on family harmony and children's education through Vedic astrology.",
        },
        walletBalance: 750,
      },
      {
        user: {
          email: 'karthik.nair@example.com',
          firstName: 'Karthik',
          lastName: 'Nair',
          name: 'Karthik Nair',
          fullName: 'Karthik Nair',
        },
        account: {
          firstName: 'Karthik',
          lastName: 'Nair',
          name: 'Karthik Nair',
          phone: '+917701234569',
          gender: 'male',
          dateOfBirth: new Date('1988-11-05'),
          timeOfBirth: '03:45 PM',
          placeOfBirth: 'Kochi, Kerala',
          languagePreference: 'English',
          maritalStatus: 'married',
          occupation: 'Business Owner',
          aboutMe:
            'Interested in business timing and Muhurat for new ventures and investments.',
        },
        walletBalance: 1200,
      },
      {
        user: {
          email: 'sneha.kulkarni@example.com',
          firstName: 'Sneha',
          lastName: 'Kulkarni',
          name: 'Sneha Kulkarni',
          fullName: 'Sneha Kulkarni',
        },
        account: {
          firstName: 'Sneha',
          lastName: 'Kulkarni',
          name: 'Sneha Kulkarni',
          phone: '+917701234570',
          gender: 'female',
          dateOfBirth: new Date('1998-02-18'),
          timeOfBirth: '09:00 AM',
          placeOfBirth: 'Pune, Maharashtra',
          languagePreference: 'Marathi',
          maritalStatus: 'single',
          occupation: 'Student',
          aboutMe:
            'Looking for guidance on love, relationships, and my future career path through numerology and tarot.',
        },
        walletBalance: 300,
      },
      {
        user: {
          email: 'vijay.reddy@example.com',
          firstName: 'Vijay',
          lastName: 'Reddy',
          name: 'Vijay Reddy',
          fullName: 'Vijay Reddy',
        },
        account: {
          firstName: 'Vijay',
          lastName: 'Reddy',
          name: 'Vijay Reddy',
          phone: '+917701234571',
          gender: 'male',
          dateOfBirth: new Date('1982-09-30'),
          timeOfBirth: '07:20 PM',
          placeOfBirth: 'Hyderabad, Telangana',
          languagePreference: 'Telugu',
          maritalStatus: 'divorced',
          occupation: 'Doctor',
          aboutMe:
            'Exploring Vedic astrology for health guidance, spiritual growth, and remarriage timing.',
        },
        walletBalance: 2000,
      },
    ];

    let seededCount = 0;

    for (const data of clients) {
      const email = data.user.email.toLowerCase().trim();

      // 1. Ensure User entity exists
      let user = await userRepository.findOne({
        where: { email, platform: PlatformEnum.CLIENT },
      });

      if (!user) {
        user = userRepository.create({
          email,
          password: hashedPassword,
          first_name: data.user.firstName,
          last_name: data.user.lastName,
          name: data.user.name,
          full_name: data.user.fullName,
          role: RoleEnum.CLIENT,
          platform: PlatformEnum.CLIENT,
          admin_permissions: null,
          email_verified_at: new Date(),
          is_blocked: false,
        });
        user = await userRepository.save(user);
        console.log(`[ClientSeeder] Created User: ${email}`);
      } else {
        user.password = hashedPassword;
        user.first_name = data.user.firstName;
        user.last_name = data.user.lastName;
        user.name = data.user.name;
        user.full_name = data.user.fullName;
        if (!user.email_verified_at) user.email_verified_at = new Date();
        user.is_blocked = false;
        user = await userRepository.save(user);
        console.log(`[ClientSeeder] Updated User credentials: ${email}`);
      }

      // 2. Ensure ClientAccount entity exists
      let account = await accountRepository.findOne({
        where: { user: { id: user.id } },
        relations: ['user'],
      });

      if (!account) {
        account = accountRepository.create({
          user,
          email,
          first_name: data.account.firstName,
          last_name: data.account.lastName,
          name: data.account.name,
          phone: data.account.phone,
          gender: data.account.gender,
          date_of_birth: data.account.dateOfBirth,
          time_of_birth: data.account.timeOfBirth,
          place_of_birth: data.account.placeOfBirth,
          language_preference: data.account.languagePreference,
          marital_status: data.account.maritalStatus,
          occupation: data.account.occupation,
          about_me: data.account.aboutMe,
          total_spending: 0,
        });
        account = await accountRepository.save(account);
        console.log(
          `[ClientSeeder] Created ClientAccount: ${account.name} (${account.id})`,
        );
      } else {
        account.first_name = data.account.firstName;
        account.last_name = data.account.lastName;
        account.name = data.account.name;
        account.phone = data.account.phone;
        account.gender = data.account.gender;
        account.date_of_birth = data.account.dateOfBirth;
        account.time_of_birth = data.account.timeOfBirth;
        account.place_of_birth = data.account.placeOfBirth;
        account.language_preference = data.account.languagePreference;
        account.marital_status = data.account.maritalStatus;
        account.occupation = data.account.occupation;
        account.about_me = data.account.aboutMe;
        account = await accountRepository.save(account);
      }

      // 3. Ensure Wallet exists
      const existingWallet = await walletRepository.findOne({
        where: { client_id: account.id },
      });

      if (!existingWallet) {
        const wallet = walletRepository.create({
          client_id: account.id,
          balance: data.walletBalance,
          reserved_balance: 0,
        });
        await walletRepository.save(wallet);
        console.log(
          `[ClientSeeder] Created Wallet for: ${data.account.name} (balance: ${data.walletBalance})`,
        );
      }

      seededCount++;
    }

    console.log(`[ClientSeeder] Successfully seeded ${seededCount} clients.`);
  }
}
