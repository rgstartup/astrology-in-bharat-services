import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Specialization } from '@/modules/expert/account/entities/specialization.entity';

export class SpecializationSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const specializationRepository = dataSource.getRepository(Specialization);

    const specializations = [
      {
        slug: 'vedic_astrology',
        title: 'Vedic Astrology',
        description: 'Ancient Jyotish & planetary guidance',
        icon: 'fa-solid fa-star-and-crescent',
        sort_order: 1,
        is_active: true,
      },
      {
        slug: 'kundli_reading',
        title: 'Kundli Reading',
        description: 'Birth chart, dasha & planetary yogas',
        icon: 'fa-solid fa-scroll',
        sort_order: 2,
        is_active: true,
      },
      {
        slug: 'prashna_kundli',
        title: 'Prashna Kundli',
        description: 'Answers to specific life questions',
        icon: 'fa-solid fa-compass',
        sort_order: 3,
        is_active: true,
      },
      {
        slug: 'tarot_reading',
        title: 'Tarot Card Reading',
        description: 'Intuitive cards for guidance & clarity',
        icon: 'fa-solid fa-layer-group',
        sort_order: 4,
        is_active: true,
      },
      {
        slug: 'numerology',
        title: 'Numerology',
        description: 'Numbers, life path & destiny insights',
        icon: 'fa-solid fa-hashtag',
        sort_order: 5,
        is_active: true,
      },
      {
        slug: 'palm_reading',
        title: 'Palm Reading',
        description: 'Hast Rekha & palm line analysis',
        icon: 'fa-solid fa-hand',
        sort_order: 6,
        is_active: true,
      },
      {
        slug: 'face_reading',
        title: 'Face Reading',
        description: 'Samudrik Shastra & facial features',
        icon: 'fa-regular fa-face-smile',
        sort_order: 7,
        is_active: true,
      },
      {
        slug: 'vastu_shastra',
        title: 'Vastu Shastra',
        description: 'Home, office & space energy guidance',
        icon: 'fa-solid fa-house-chimney-window',
        sort_order: 8,
        is_active: true,
      },
      {
        slug: 'marriage_astrology',
        title: 'Marriage Astrology',
        description: 'Marriage timing & relationship compatibility',
        icon: 'fa-solid fa-heart',
        sort_order: 9,
        is_active: true,
      },
      {
        slug: 'compatibility',
        title: 'Compatibility',
        description: 'Kundli matching & relationship harmony',
        icon: 'fa-solid fa-people-arrows',
        sort_order: 10,
        is_active: true,
      },
      {
        slug: 'muhurat',
        title: 'Muhurat',
        description: 'Auspicious dates & timings for events',
        icon: 'fa-solid fa-calendar-check',
        sort_order: 11,
        is_active: true,
      },
      {
        slug: 'gemstone_consultation',
        title: 'Gemstone Consultation',
        description: 'Planetary gemstones & recommendations',
        icon: 'fa-solid fa-gem',
        sort_order: 12,
        is_active: true,
      },
      {
        slug: 'astrology_remedies',
        title: 'Astrological Remedies',
        description: 'Mantra, puja & planetary remedies',
        icon: 'fa-solid fa-hands-praying',
        sort_order: 13,
        is_active: true,
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const specData of specializations) {
      const existing = await specializationRepository.findOne({
        where: { slug: specData.slug },
      });

      if (!existing) {
        const item = specializationRepository.create(specData);
        await specializationRepository.save(item);
        createdCount++;
      } else {
        existing.title = specData.title;
        existing.description = specData.description;
        existing.icon = specData.icon;
        existing.sort_order = specData.sort_order;
        existing.is_active = specData.is_active;
        await specializationRepository.save(existing);
        updatedCount++;
      }
    }

    console.log(
      `[SpecializationSeeder] Finished. Created: ${createdCount}, Updated: ${updatedCount} (Total: ${specializations.length}).`,
    );
  }
}
