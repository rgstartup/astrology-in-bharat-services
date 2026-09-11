import { Seeder } from 'typeorm-extension';
import { DataSource, In } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { Specialization } from '@/modules/expert/account/entities/specialization.entity';
import { ExpertSpecialization } from '@/modules/expert/account/entities/expert-specialization.entity';
import { ExpertPricing } from '@/modules/expert/account/entities/expert-pricing.entity';
import {
  PricingStatus,
  PricingTargetAudience,
} from '@/modules/expert/shared/enums/pricing.enum';
import { ExpertKycStatus } from '@/modules/expert/shared/enums/kyc-status.enum';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { Wallet } from '@/modules/finance/wallet/infrastructure/entities/wallet.entity';

interface ExpertSeedData {
  user: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    name: string;
    fullName: string;
  };
  account: {
    name: string;
    phone: string;
    gender: 'male' | 'female' | 'other';
    dateOfBirth: Date;
    bio: string;
    about: string;
    languages: string;
    specializationSummary: string;
    experienceInYears: number;
    totalLikes: number;
    totalReviews: number;
    rating: number;
    consultationCount: number;
    isAvailable: boolean;
  };
  specializationSlugs: string[];
  pricing: {
    chatPrice: number;
    callPrice: number;
    videoCallPrice: number;
    reportPrice: number;
    horoscopePrice: number;
    currency: string;
  };
}

export class ExpertSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const accountRepository = dataSource.getRepository(ExpertAccount);
    const profileRepository = dataSource.getRepository(ProfileExpert);
    const specializationRepository = dataSource.getRepository(Specialization);
    const expertSpecRepository = dataSource.getRepository(ExpertSpecialization);
    const pricingRepository = dataSource.getRepository(ExpertPricing);
    const walletRepository = dataSource.getRepository(Wallet);

    const defaultPassword = process.env.EXPERT_SEED_PASSWORD || 'Expert@123456';
    const hashedPassword = await argon2.hash(defaultPassword, {
      type: argon2.argon2id,
    });

    const experts: ExpertSeedData[] = [
      {
        user: {
          email: 'acharya.rajesh@astrologyinbharat.com',
          firstName: 'Rajesh',
          lastName: 'Sharma',
          name: 'Acharya Rajesh Sharma',
          fullName: 'Acharya Rajesh Sharma',
        },
        account: {
          name: 'Acharya Rajesh Sharma',
          phone: '+919876543210',
          gender: 'male',
          dateOfBirth: new Date('1985-06-15'),
          bio: 'Renowned Vedic Astrologer & Kundli Specialist with over 15 years of experience in Vedic calculations and planetary remedies.',
          about:
            'Acharya Rajesh Sharma comes from a traditional lineage of astrologers in Varanasi. He has deep expertise in Vedic Astrology, Kundli Reading, Prashna Kundli, and Muhurat calculations, guiding thousands of individuals in relationships, career growth, and life milestones.',
          languages: 'Hindi, English, Sanskrit',
          specializationSummary:
            'Vedic Astrology, Kundli Reading, Prashna Kundli, Muhurat, Astrological Remedies',
          experienceInYears: 15,
          totalLikes: 350,
          totalReviews: 128,
          rating: 4.9,
          consultationCount: 480,
          isAvailable: true,
        },
        specializationSlugs: [
          'vedic_astrology',
          'kundli_reading',
          'prashna_kundli',
          'muhurat',
          'astrology_remedies',
        ],
        pricing: {
          chatPrice: 25.0,
          callPrice: 30.0,
          videoCallPrice: 50.0,
          reportPrice: 499.0,
          horoscopePrice: 299.0,
          currency: 'INR',
        },
      },
      {
        user: {
          email: 'dr.priya@astrologyinbharat.com',
          firstName: 'Priya',
          lastName: 'Shukla',
          name: 'Dr. Priya Shukla',
          fullName: 'Dr. Priya Shukla',
        },
        account: {
          name: 'Dr. Priya Shukla',
          phone: '+919876543211',
          gender: 'female',
          dateOfBirth: new Date('1992-11-20'),
          bio: 'Certified Tarot Master, Numerologist & Vastu Consultant providing intuitive and practical life guidance.',
          about:
            'Dr. Priya Shukla brings intuitive clarity and holistic energy harmony through Tarot Card Reading, Numerology, Compatibility Analysis, and Vastu Shastra. She specializes in relationship dynamics, personal career transitions, and gemstone recommendations.',
          languages: 'English, Hindi, Marathi',
          specializationSummary:
            'Tarot Card Reading, Numerology, Vastu Shastra, Compatibility, Gemstone Consultation',
          experienceInYears: 9,
          totalLikes: 280,
          totalReviews: 94,
          rating: 4.8,
          consultationCount: 310,
          isAvailable: true,
        },
        specializationSlugs: [
          'tarot_reading',
          'numerology',
          'vastu_shastra',
          'compatibility',
          'gemstone_consultation',
        ],
        pricing: {
          chatPrice: 20.0,
          callPrice: 25.0,
          videoCallPrice: 40.0,
          reportPrice: 399.0,
          horoscopePrice: 199.0,
          currency: 'INR',
        },
      },
    ];

    let seededCount = 0;

    for (const data of experts) {
      const email = data.user.email.toLowerCase().trim();

      // 1. Ensure User entity exists
      let user = await userRepository.findOne({
        where: { email, platform: PlatformEnum.EXPERT },
      });

      if (!user) {
        user = userRepository.create({
          email,
          password: hashedPassword,
          first_name: data.user.firstName,
          last_name: data.user.lastName,
          name: data.user.name,
          full_name: data.user.fullName,
          role: RoleEnum.EXPERT,
          platform: PlatformEnum.EXPERT,
          admin_permissions: null,
          email_verified_at: new Date(),
          is_blocked: false,
        });
        user = await userRepository.save(user);
        console.log(`[ExpertSeeder] Created User for expert: ${email}`);
      } else {
        user.first_name = data.user.firstName;
        user.last_name = data.user.lastName;
        user.name = data.user.name;
        user.full_name = data.user.fullName;
        if (!user.email_verified_at) user.email_verified_at = new Date();
        user = await userRepository.save(user);
      }

      // 2. Ensure ExpertAccount entity exists
      let account = await accountRepository.findOne({
        where: { user: { id: user.id } },
        relations: ['user'],
      });

      if (!account) {
        account = accountRepository.create({
          user,
          email,
          name: data.account.name,
          phone: data.account.phone,
          phone_number: data.account.phone,
          gender: data.account.gender,
          date_of_birth: data.account.dateOfBirth,
          specialization: data.account.specializationSummary,
          bio: data.account.bio,
          about: data.account.about,
          about_me: data.account.about,
          languages: data.account.languages,
          experience_in_years: data.account.experienceInYears,
          total_likes: data.account.totalLikes,
          total_reviews: data.account.totalReviews,
          rating: data.account.rating,
          kyc_status: ExpertKycStatus.APPROVED,
          consultation_count: data.account.consultationCount,
          price: data.pricing.chatPrice,
          chat_price: data.pricing.chatPrice,
          call_price: data.pricing.callPrice,
          video_call_price: data.pricing.videoCallPrice,
          report_price: data.pricing.reportPrice,
          horoscope_price: data.pricing.horoscopePrice,
          is_available: data.account.isAvailable,
          total_earning: 0,
        });
        account = await accountRepository.save(account);
        console.log(
          `[ExpertSeeder] Created ExpertAccount: ${account.name} (${account.id})`,
        );
      } else {
        account.name = data.account.name;
        account.phone = data.account.phone;
        account.phone_number = data.account.phone;
        account.gender = data.account.gender;
        account.date_of_birth = data.account.dateOfBirth;
        account.specialization = data.account.specializationSummary;
        account.bio = data.account.bio;
        account.about = data.account.about;
        account.about_me = data.account.about;
        account.languages = data.account.languages;
        account.experience_in_years = data.account.experienceInYears;
        account.total_likes = data.account.totalLikes;
        account.total_reviews = data.account.totalReviews;
        account.rating = data.account.rating;
        account.kyc_status = ExpertKycStatus.APPROVED;
        account.consultation_count = data.account.consultationCount;
        account.price = data.pricing.chatPrice;
        account.chat_price = data.pricing.chatPrice;
        account.call_price = data.pricing.callPrice;
        account.video_call_price = data.pricing.videoCallPrice;
        account.report_price = data.pricing.reportPrice;
        account.horoscope_price = data.pricing.horoscopePrice;
        account.is_available = data.account.isAvailable;
        account = await accountRepository.save(account);
      }

      // 3. Ensure ProfileExpert entity exists
      let profile = await profileRepository.findOne({
        where: { user_id: user.id },
      });

      if (!profile) {
        profile = profileRepository.create({
          user,
          user_id: user.id,
          email,
          name: data.account.name,
          phone_number: data.account.phone,
          gender: data.account.gender,
          date_of_birth: data.account.dateOfBirth,
          specialization: data.account.specializationSummary,
          bio: data.account.bio,
          about: data.account.about,
          languages: data.account.languages,
          experience_in_years: data.account.experienceInYears,
          total_likes: data.account.totalLikes,
          total_reviews: data.account.totalReviews,
          rating: data.account.rating,
          kyc_status: 'approved',
          consultation_count: data.account.consultationCount,
          price: data.pricing.chatPrice,
          chat_price: data.pricing.chatPrice,
          call_price: data.pricing.callPrice,
          video_call_price: data.pricing.videoCallPrice,
          report_price: data.pricing.reportPrice,
          horoscope_price: data.pricing.horoscopePrice,
          is_available: data.account.isAvailable,
          total_earning: 0,
        });
        await profileRepository.save(profile);
      } else {
        profile.name = data.account.name;
        profile.email = email;
        profile.phone_number = data.account.phone;
        profile.gender = data.account.gender;
        profile.date_of_birth = data.account.dateOfBirth;
        profile.specialization = data.account.specializationSummary;
        profile.bio = data.account.bio;
        profile.about = data.account.about;
        profile.languages = data.account.languages;
        profile.experience_in_years = data.account.experienceInYears;
        profile.total_likes = data.account.totalLikes;
        profile.total_reviews = data.account.totalReviews;
        profile.rating = data.account.rating;
        profile.kyc_status = 'approved';
        profile.consultation_count = data.account.consultationCount;
        profile.price = data.pricing.chatPrice;
        profile.chat_price = data.pricing.chatPrice;
        profile.call_price = data.pricing.callPrice;
        profile.video_call_price = data.pricing.videoCallPrice;
        profile.report_price = data.pricing.reportPrice;
        profile.horoscope_price = data.pricing.horoscopePrice;
        profile.is_available = data.account.isAvailable;
        await profileRepository.save(profile);
      }

      // 4. Ensure Wallet exists
      const existingWallet = await walletRepository.findOne({
        where: { expert_id: account.id },
      });
      if (!existingWallet) {
        const wallet = walletRepository.create({
          expert_id: account.id,
          balance: 0,
          reserved_balance: 0,
        });
        await walletRepository.save(wallet);
      }

      // 5. Link Specializations
      const matchedSpecializations = await specializationRepository.find({
        where: { slug: In(data.specializationSlugs) },
      });

      for (const spec of matchedSpecializations) {
        const existingLink = await expertSpecRepository.findOne({
          where: {
            expert: { id: account.id },
            specialization: { id: spec.id },
          },
        });

        if (!existingLink) {
          const specLink = expertSpecRepository.create({
            expert: account,
            specialization: spec,
          });
          await expertSpecRepository.save(specLink);
        }
      }

      // 6. Ensure Active ExpertPricing exists
      const existingPricing = await pricingRepository.findOne({
        where: {
          expert_id: account.id,
          target_audience: PricingTargetAudience.ALL,
          is_active: true,
          status: PricingStatus.ACTIVE,
        },
      });

      if (!existingPricing) {
        const pricing = pricingRepository.create({
          expert_id: account.id,
          target_audience: PricingTargetAudience.ALL,
          chat_price: data.pricing.chatPrice,
          call_price: data.pricing.callPrice,
          video_call_price: data.pricing.videoCallPrice,
          report_price: data.pricing.reportPrice,
          horoscope_price: data.pricing.horoscopePrice,
          currency: data.pricing.currency,
          is_active: true,
          status: PricingStatus.ACTIVE,
          effective_from: new Date(),
        });
        await pricingRepository.save(pricing);
        console.log(`[ExpertSeeder] Created pricing for: ${data.account.name}`);
      } else {
        existingPricing.chat_price = data.pricing.chatPrice;
        existingPricing.call_price = data.pricing.callPrice;
        existingPricing.video_call_price = data.pricing.videoCallPrice;
        existingPricing.report_price = data.pricing.reportPrice;
        existingPricing.horoscope_price = data.pricing.horoscopePrice;
        existingPricing.currency = data.pricing.currency;
        await pricingRepository.save(existingPricing);
      }

      seededCount++;
    }

    console.log(`[ExpertSeeder] Successfully seeded ${seededCount} experts.`);
  }
}
