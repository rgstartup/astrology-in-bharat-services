import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { Product } from '@/modules/commerce/product/entities/product.entity';
import { ExpertProducts } from '@/modules/expert/products/entities/expert-product.entity';
import { ExpertProductRelationType } from '@/modules/expert/products/enum/expert-product-relation-type.enum';

interface ExpertProductSeedPair {
  expertEmail: string;
  productNames: string[];
}

export class ExpertProductSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const expertAccountRepository = dataSource.getRepository(ExpertAccount);
    const productRepository = dataSource.getRepository(Product);
    const expertProductRepository = dataSource.getRepository(ExpertProducts);

    const pairings: ExpertProductSeedPair[] = [
      // -----------------------------------------------------------------------
      // Pair 1: Acharya Rajesh Sharma (acharya.rajesh@astrologyinbharat.com)
      // Products: Rudraksha, Yantras, Pujas, Havans, Sanskars, Life Reports, Live Calls
      // -----------------------------------------------------------------------
      {
        expertEmail: 'acharya.rajesh@astrologyinbharat.com',
        productNames: [
          'Nepali 5 Mukhi Rudraksha Mala (108 Beads)',
          'Siddha 1 to 14 Mukhi Rudraksha Collector Mala',
          'Shree Sampurna Maha Lakshmi Yantra',
          'Mahamrityunjaya Kavach & Protective Yantra Plate',
          'Brihat Parashara Hora Shastra (2 Volumes Set)',
          'Lal Kitab Ke Asan Aur Achook Upay',
          'Vedic Astrology Comprehensive Life Horoscope Report',
          'Vedic Janam Kundali & Navamsa Chart Detailed Dossier',
          'Kaal Sarp & Mangal Dosh Comprehensive Diagnosis',
          'Sri Satyanarayan Maha Puja & Katha',
          'Rudrabhishek Puja at Kashi Vishwanath Kshetra',
          'Maha Mrityunjaya Havan & Planetary Shanti Yagya',
          'Navagraha Shanti & Dosha Nivaran Havan',
          'Vedic Namkaran Sanskar (Naming Ceremony)',
          'Vivah Sanskar (Vedic Wedding Rituals Consultation & Ceremony)',
          'Live Astrologer Consultation (Instant Audio/Video Call)',
        ],
      },

      // -----------------------------------------------------------------------
      // Pair 2: Dr. Priya Shukla (dr.priya@astrologyinbharat.com)
      // Products: Gemstones, Vastu Audits, Transit Forecasts, Yog Wealth, Live Calls
      // -----------------------------------------------------------------------
      {
        expertEmail: 'dr.priya@astrologyinbharat.com',
        productNames: [
          'Natural Ceylon Blue Sapphire (Neelam)',
          'Natural Zambian Emerald (Panna)',
          'Instant 2026 Planetary Transit & Varshphal PDF',
          'Residential Vastu Energy & Layout Audit Report',
          'Raj Yog, Gajakesari & Dhana Yog Wealth Analysis',
          'Live Astrologer Consultation (Instant Audio/Video Call)',
        ],
      },
    ];

    let linkedCount = 0;

    for (const pair of pairings) {
      const expert = await expertAccountRepository.findOne({
        where: [{ email: pair.expertEmail }, { user: { email: pair.expertEmail } }],
      });

      if (!expert) {
        console.warn(`[ExpertProductSeeder] Expert not found: ${pair.expertEmail}`);
        continue;
      }

      for (const productName of pair.productNames) {
        const product = await productRepository.findOne({
          where: { name: productName },
        });

        if (!product) {
          console.warn(`[ExpertProductSeeder] Product not found: ${productName}`);
          continue;
        }

        let link = await expertProductRepository.findOne({
          where: {
            expert_id: expert.id,
            product_id: product.id,
            relation_type: ExpertProductRelationType.PROVIDER,
          },
        });

        if (!link) {
          link = expertProductRepository.create({
            expert,
            expert_id: expert.id,
            product,
            product_id: product.id,
            relation_type: ExpertProductRelationType.PROVIDER,
          });
          await expertProductRepository.save(link);
          console.log(
            `[ExpertProductSeeder] Linked Expert: ${pair.expertEmail} -> Product: "${product.name}" as PROVIDER`,
          );
        }

        linkedCount++;
      }
    }

    console.log(`[ExpertProductSeeder] Finished seeding ${linkedCount} expert_products relations.`);
  }
}
