import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { ConsultationTopic } from '@/modules/consultation/consultation/entities/consultation_topic.entity';

export class ConsultationTopicSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const topicRepository = dataSource.getRepository(ConsultationTopic);

    const topics = [
      {
        title: 'Love & Relationships',
        slug: 'love-relationships',
        description: 'Compatibility, breakup & soulmates',
        sort_order: 1,
        is_active: true,
      },
      {
        title: 'Career & Profession',
        slug: 'career-profession',
        description: 'Promotion, job change & growth',
        sort_order: 2,
        is_active: true,
      },
      {
        title: 'Money & Wealth',
        slug: 'money-wealth',
        description: 'Investments, debts & abundance',
        sort_order: 3,
        is_active: true,
      },
      {
        title: 'Health & Vitality',
        slug: 'health-vitality',
        description: 'Wellness, mental peace & energy',
        sort_order: 4,
        is_active: true,
      },
      {
        title: 'Marriage & Kundli',
        slug: 'marriage-kundli',
        description: 'Manglik dosha, timing & spouse',
        sort_order: 5,
        is_active: true,
      },
      {
        title: 'Business & Trade',
        slug: 'business-trade',
        description: 'New venture, profits & partnership',
        sort_order: 6,
        is_active: true,
      },
      {
        title: 'Education & Exams',
        slug: 'education-exams',
        description: 'Higher studies, competitive exams',
        sort_order: 7,
        is_active: true,
      },
      {
        title: 'Spiritual Remedies',
        slug: 'spiritual-remedies',
        description: 'Puja, gemstones, mantras & peace',
        sort_order: 8,
        is_active: true,
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const topicData of topics) {
      const existing = await topicRepository.findOne({
        where: { slug: topicData.slug },
      });

      if (!existing) {
        const item = topicRepository.create(topicData);
        await topicRepository.save(item);
        createdCount++;
      } else {
        existing.title = topicData.title;
        existing.description = topicData.description;
        existing.sort_order = topicData.sort_order;
        existing.is_active = topicData.is_active;
        await topicRepository.save(existing);
        updatedCount++;
      }
    }

    console.log(
      `[ConsultationTopicSeeder] Finished. Created: ${createdCount}, Updated: ${updatedCount} (Total: ${topics.length}).`,
    );
  }
}
