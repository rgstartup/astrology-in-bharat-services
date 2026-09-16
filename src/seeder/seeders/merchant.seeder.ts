import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '@/modules/users/entities/user.entity';
import { RoleEnum } from '@/modules/users/enums/Role.enum';
import { PlatformEnum } from '@/modules/users/enums/Platform.enum';
import {
  MerchantAccount,
  MerchantStatus,
} from '@/modules/merchant/account/entities/account.entity';
import { Wallet } from '@/modules/finance/wallet/entities/wallet.entity';

interface MerchantSeedData {
  user: {
    email: string;
    firstName: string;
    lastName: string;
    name: string;
    fullName: string;
  };
  account: {
    name: string;
    email: string;
    phone: string;
    shopName: string;
    managerName: string;
    address: string;
    city: string;
    pincode: string;
    description: string;
    established: string;
    features: string[];
    isTrusted: boolean;
    rating: number;
    reviewCount: number;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    ifsc: string;
    pan: string;
    gstin: string;
    operationalHours: string;
    trustScore: string;
  };
}

export class MerchantSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const accountRepository = dataSource.getRepository(MerchantAccount);
    const walletRepository = dataSource.getRepository(Wallet);

    const defaultPassword =
      process.env.MERCHANT_SEED_PASSWORD || 'Merchant@123456';
    const hashedPassword = await argon2.hash(defaultPassword, {
      type: argon2.argon2id,
    });

    const merchants: MerchantSeedData[] = [
      {
        user: {
          email: 'rudraksha.bazaar@astrologyinbharat.com',
          firstName: 'Ramesh',
          lastName: 'Agarwal',
          name: 'Ramesh Agarwal',
          fullName: 'Ramesh Agarwal',
        },
        account: {
          name: 'Ramesh Agarwal',
          email: 'rudraksha.bazaar@astrologyinbharat.com',
          phone: '+919988776655',
          shopName: 'Rudraksha Bazaar',
          managerName: 'Ramesh Agarwal',
          address: '12, Shivaji Marg, Karol Bagh',
          city: 'New Delhi',
          pincode: '110005',
          description:
            'Rudraksha Bazaar is a trusted source for authentic Rudraksha beads, Shaligrams, crystals, and sacred gemstones. All products are energized and certified. We serve devotees and astrology practitioners across India with purity and devotion.',
          established: '2008',
          features: [
            'Authentic Certification',
            'Lab Tested Gemstones',
            'Free Energization',
            'Pan India Shipping',
            'Expert Consultation',
          ],
          isTrusted: true,
          rating: 4.8,
          reviewCount: 342,
          bankName: 'HDFC Bank',
          accountHolder: 'Ramesh Agarwal',
          accountNumber: '50100123456789',
          ifsc: 'HDFC0001234',
          pan: 'ABCPA1234D',
          gstin: '07ABCPA1234D1Z5',
          operationalHours: '10:00 AM - 08:00 PM',
          trustScore: '99.2',
        },
      },
      {
        user: {
          email: 'divya.gemhouse@astrologyinbharat.com',
          firstName: 'Divya',
          lastName: 'Singhania',
          name: 'Divya Singhania',
          fullName: 'Divya Singhania',
        },
        account: {
          name: 'Divya Singhania',
          email: 'divya.gemhouse@astrologyinbharat.com',
          phone: '+919988776656',
          shopName: 'Divya Gem House',
          managerName: 'Divya Singhania',
          address: '7, Sarafa Bazar, M.G. Road',
          city: 'Jaipur',
          pincode: '302001',
          description:
            'Divya Gem House specialises in Jaipur-certified natural gemstones including Blue Sapphire, Ruby, Emerald, and Yellow Sapphire. Every stone is paired with a detailed Jyotish recommendation sheet for the buyer.',
          established: '2015',
          features: [
            'GIA Certified Stones',
            'Jyotish Pairing Guidance',
            'Custom Ring Making',
            'EMI Available',
            'Online Gemstone Consultation',
          ],
          isTrusted: true,
          rating: 4.9,
          reviewCount: 215,
          bankName: 'State Bank of India',
          accountHolder: 'Divya Singhania',
          accountNumber: '32109876543210',
          ifsc: 'SBIN0004567',
          pan: 'XYZPS5678E',
          gstin: '08XYZPS5678E1Z3',
          operationalHours: '10:00 AM - 07:30 PM',
          trustScore: '99.5',
        },
      },
      {
        user: {
          email: 'puja.samagri.store@astrologyinbharat.com',
          firstName: 'Mohan',
          lastName: 'Tiwari',
          name: 'Mohan Tiwari',
          fullName: 'Mohan Tiwari',
        },
        account: {
          name: 'Mohan Tiwari',
          email: 'puja.samagri.store@astrologyinbharat.com',
          phone: '+919988776657',
          shopName: 'Puja Samagri Store',
          managerName: 'Mohan Tiwari',
          address: '34, Ghats Road, Dashashwamedh',
          city: 'Varanasi',
          pincode: '221001',
          description:
            "Puja Samagri Store is the one-stop shop for all Vedic puja essentials — from incense and diyas to havan samagri, yantras, and puja thali sets. Sourced from Varanasi's most sacred suppliers.",
          established: '2003',
          features: [
            'Handmade Products',
            'Bulk Order Available',
            'Custom Puja Kits',
            'Next-Day Delivery',
            'Temple Tie-Ups',
          ],
          isTrusted: true,
          rating: 4.7,
          reviewCount: 510,
          bankName: 'Bank of Baroda',
          accountHolder: 'Mohan Tiwari',
          accountNumber: '19873456789012',
          ifsc: 'BARB0VARASI',
          pan: 'LMNPT9012F',
          gstin: '09LMNPT9012F1Z8',
          operationalHours: '07:00 AM - 09:00 PM',
          trustScore: '98.7',
        },
      },
      {
        user: {
          email: 'yantra.mandir@astrologyinbharat.com',
          firstName: 'Supriya',
          lastName: 'Bhatia',
          name: 'Supriya Bhatia',
          fullName: 'Supriya Bhatia',
        },
        account: {
          name: 'Supriya Bhatia',
          email: 'yantra.mandir@astrologyinbharat.com',
          phone: '+919988776658',
          shopName: 'Yantra Mandir',
          managerName: 'Supriya Bhatia',
          address: '22, Linking Road, Bandra West',
          city: 'Mumbai',
          pincode: '400050',
          description:
            'Yantra Mandir offers a premium selection of energized Yantras, Vastu correction tools, and protective amulets. Each Yantra is hand-engraved on copper or gold-plated brass and activated by expert priests.',
          established: '2012',
          features: [
            'Hand-Engraved Yantras',
            'Priest-Activated Products',
            'Vastu Correction Kits',
            'Express Delivery Mumbai',
            '30-Day Return Policy',
          ],
          isTrusted: false,
          rating: 4.5,
          reviewCount: 138,
          bankName: 'Axis Bank',
          accountHolder: 'Supriya Bhatia',
          accountNumber: '91234567890123',
          ifsc: 'UTIB0001234',
          pan: 'PQRSB3456G',
          gstin: '27PQRSB3456G1Z1',
          operationalHours: '10:00 AM - 08:30 PM',
          trustScore: '97.9',
        },
      },
      {
        user: {
          email: 'vedic.books.emporium@astrologyinbharat.com',
          firstName: 'Govind',
          lastName: 'Rao',
          name: 'Govind Rao',
          fullName: 'Govind Rao',
        },
        account: {
          name: 'Govind Rao',
          email: 'vedic.books.emporium@astrologyinbharat.com',
          phone: '+919988776659',
          shopName: 'Vedic Books Emporium',
          managerName: 'Govind Rao',
          address: '5, Chamiers Road, R.A. Puram',
          city: 'Chennai',
          pincode: '600028',
          description:
            `Vedic Books Emporium is South India's largest repository of Vedic scriptures, Jyotish texts, and Sanskrit manuscripts. We stock original editions and high-quality reprints of rare astrological classics in multiple Indian languages.`,
          established: '1998',
          features: [
            'Rare Manuscript Prints',
            'Multi-Language Collection',
            'Wholesale Pricing',
            'Digital Book Downloads',
            'Expert Book Recommendations',
          ],
          isTrusted: true,
          rating: 4.6,
          reviewCount: 287,
          bankName: 'Indian Bank',
          accountHolder: 'Govind Rao',
          accountNumber: '60012345678901',
          ifsc: 'IDIB000C123',
          pan: 'UVWGR7890H',
          gstin: '33UVWGR7890H1Z6',
          operationalHours: '09:00 AM - 07:00 PM',
          trustScore: '99.0',
        },
      },
    ];

    let seededCount = 0;

    for (const data of merchants) {
      const email = data.user.email.toLowerCase().trim();

      // 1. Ensure User entity exists
      let user = await userRepository.findOne({
        where: { email, platform: PlatformEnum.MERCHANT },
      });

      if (!user) {
        user = userRepository.create({
          email,
          password: hashedPassword,
          first_name: data.user.firstName,
          last_name: data.user.lastName,
          name: data.user.name,
          full_name: data.user.fullName,
          role: RoleEnum.MERCHANT,
          platform: PlatformEnum.MERCHANT,
          admin_permissions: null,
          email_verified_at: new Date(),
          is_blocked: false,
        });
        user = await userRepository.save(user);
        console.log(`[MerchantSeeder] Created User: ${email}`);
      } else {
        user.first_name = data.user.firstName;
        user.last_name = data.user.lastName;
        user.name = data.user.name;
        user.full_name = data.user.fullName;
        if (!user.email_verified_at) user.email_verified_at = new Date();
        user = await userRepository.save(user);
      }

      // 2. Ensure MerchantAccount entity exists
      let account = await accountRepository.findOne({
        where: { user_id: user.id },
      });

      if (!account) {
        account = accountRepository.create({
          user,
          user_id: user.id,
          name: data.account.name,
          email: data.account.email,
          phone: data.account.phone,
          shop_name: data.account.shopName,
          manager_name: data.account.managerName,
          address: data.account.address,
          city: data.account.city,
          pincode: data.account.pincode,
          description: data.account.description,
          established: data.account.established,
          features: data.account.features,
          is_trusted: data.account.isTrusted,
          rating: data.account.rating,
          review_count: data.account.reviewCount,
          bank_name: data.account.bankName,
          account_holder: data.account.accountHolder,
          account_number: data.account.accountNumber,
          ifsc: data.account.ifsc,
          pan: data.account.pan,
          gstin: data.account.gstin,
          operational_hours: data.account.operationalHours,
          trust_score: data.account.trustScore,
          status: MerchantStatus.ACTIVE,
          is_verified: true,
          is_online: true,
          is_blocked: false,
          is_gst_exempt: false,
        });
        account = await accountRepository.save(account);
        console.log(
          `[MerchantSeeder] Created MerchantAccount: ${account.shop_name} (${account.id})`,
        );
      } else {
        account.name = data.account.name;
        account.email = data.account.email;
        account.phone = data.account.phone;
        account.shop_name = data.account.shopName;
        account.manager_name = data.account.managerName;
        account.address = data.account.address;
        account.city = data.account.city;
        account.pincode = data.account.pincode;
        account.description = data.account.description;
        account.established = data.account.established;
        account.features = data.account.features;
        account.is_trusted = data.account.isTrusted;
        account.rating = data.account.rating;
        account.review_count = data.account.reviewCount;
        account.bank_name = data.account.bankName;
        account.account_holder = data.account.accountHolder;
        account.account_number = data.account.accountNumber;
        account.ifsc = data.account.ifsc;
        account.pan = data.account.pan;
        account.gstin = data.account.gstin;
        account.operational_hours = data.account.operationalHours;
        account.trust_score = data.account.trustScore;
        account.status = MerchantStatus.ACTIVE;
        account.is_verified = true;
        account = await accountRepository.save(account);
      }

      // 3. Ensure Wallet exists
      const existingWallet = await walletRepository.findOne({
        where: { merchant_id: account.id },
      });

      if (!existingWallet) {
        const wallet = walletRepository.create({
          merchant_id: account.id,
          balance: 0,
          reserved_balance: 0,
        });
        await walletRepository.save(wallet);
        console.log(
          `[MerchantSeeder] Created Wallet for: ${data.account.shopName}`,
        );
      }

      seededCount++;
    }

    console.log(
      `[MerchantSeeder] Successfully seeded ${seededCount} merchants.`,
    );
  }
}
