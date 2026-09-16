import { Seeder } from 'typeorm-extension';
import { DataSource, In } from 'typeorm';
import { Profession } from '@/modules/expert/profession/entities/profession.entity';
import { Specialization } from '@/modules/expert/specialization/entities/specialization.entity';

export class ProfessionSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const professionRepository = dataSource.getRepository(Profession);
    const specializationRepository = dataSource.getRepository(Specialization);

    const professionsData = [
      {
        slug: 'astrologer',
        title: 'Astrologer (Jyotishi)',
        description:
          'Expert in Vedic Jyotish, Kundli reading, planetary transits, dasha analysis, and life event predictions.',
        icon: 'fa-solid fa-star-and-crescent',
        sort_order: 1,
        is_active: true,
        specializationSlugs: [
          'vedic_astrology',
          'kundli_reading',
          'prashna_kundli',
          'marriage_astrology',
          'compatibility',
          'muhurat',
          'gemstone_consultation',
          'astrology_remedies',
        ],
      },
      {
        slug: 'pandit',
        title: 'Pandit / Purohit / Karmkandi',
        description:
          'Vedic priest experienced in executing Vedic rituals, Havans, Griha Pravesh, Rudrabhishek, and dosha shanti pujas.',
        icon: 'fa-solid fa-om',
        sort_order: 2,
        is_active: true,
        specializationSlugs: [
          'astrology_remedies',
          'muhurat',
          'kundli_reading',
          'vedic_astrology',
        ],
      },
      {
        slug: 'numerologist',
        title: 'Numerologist (Ank Jyotishi)',
        description:
          'Specialist in Mulank, Bhagyank, name spelling frequency corrections, and favorable business numbers.',
        icon: 'fa-solid fa-hashtag',
        sort_order: 3,
        is_active: true,
        specializationSlugs: ['numerology', 'compatibility'],
      },
      {
        slug: 'tarot_reader',
        title: 'Tarot Card Reader',
        description:
          'Intuitive tarot master guiding through relationship questions, energy alignment, and near-future clarity.',
        icon: 'fa-solid fa-layer-group',
        sort_order: 4,
        is_active: true,
        specializationSlugs: ['tarot_reading', 'compatibility'],
      },
      {
        slug: 'vastu_expert',
        title: 'Vastu Shastra Consultant',
        description:
          'Architectural and directional energy harmonizer for residences, commercial properties, and industrial layouts.',
        icon: 'fa-solid fa-house-chimney-window',
        sort_order: 5,
        is_active: true,
        specializationSlugs: ['vastu_shastra'],
      },
      {
        slug: 'palmist',
        title: 'Palmist & Samudrik Shastra Expert',
        description:
          'Reader of Hast Rekha lines, mounts, and facial features for temperament and life milestone predictions.',
        icon: 'fa-solid fa-hand',
        sort_order: 6,
        is_active: true,
        specializationSlugs: ['palm_reading', 'face_reading'],
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of professionsData) {
      let profession = await professionRepository.findOne({
        where: { slug: item.slug },
        relations: ['specializations'],
      });

      // Fetch matching specializations
      const specializations = await specializationRepository.find({
        where: { slug: In(item.specializationSlugs) },
      });

      if (!profession) {
        profession = professionRepository.create({
          slug: item.slug,
          title: item.title,
          description: item.description,
          icon: item.icon,
          sort_order: item.sort_order,
          is_active: item.is_active,
          specializations,
        });
        await professionRepository.save(profession);
        createdCount++;
      } else {
        profession.title = item.title;
        profession.description = item.description;
        profession.icon = item.icon;
        profession.sort_order = item.sort_order;
        profession.is_active = item.is_active;
        profession.specializations = specializations;
        await professionRepository.save(profession);
        updatedCount++;
      }
    }

    console.log(
      `[ProfessionSeeder] Finished. Created: ${createdCount}, Updated: ${updatedCount} (Total: ${professionsData.length}).`,
    );
  }
}
