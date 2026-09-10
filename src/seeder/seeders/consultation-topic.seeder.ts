import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsultationTopic } from '@/modules/consultation/consultation/entities/consultation_topic.entity';
import { ISeeder } from '../interfaces/seeder.interface';

@Injectable()
export class ConsultationTopicSeeder implements ISeeder {
  readonly name = 'ConsultationTopicSeeder';
  private readonly logger = new Logger(ConsultationTopicSeeder.name);

  constructor(
    @InjectRepository(ConsultationTopic)
    private readonly topicRepository: Repository<ConsultationTopic>,
  ) {}

  async run(): Promise<void> {
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
      const existing = await this.topicRepository.findOne({
        where: { slug: topicData.slug },
      });

      if (!existing) {
        const item = this.topicRepository.create(topicData);
        await this.topicRepository.save(item);
        createdCount++;
      } else {
        // Update description, title, sort order if changed
        existing.title = topicData.title;
        existing.description = topicData.description;
        existing.sort_order = topicData.sort_order;
        existing.is_active = topicData.is_active;
        await this.topicRepository.save(existing);
        updatedCount++;
      }
    }

    this.logger.log(
      `ConsultationTopicSeeder finished. Created: ${createdCount}, Updated: ${updatedCount} (Total: ${topics.length}).`,
    );
  }

  async drop(): Promise<void> {
    const slugs = [
      'love-relationships',
      'career-profession',
      'money-wealth',
      'health-vitality',
      'marriage-kundli',
      'business-trade',
      'education-exams',
      'spiritual-remedies',
    ];

    await this.topicRepository
      .createQueryBuilder()
      .delete()
      .where('slug IN (:...slugs)', { slugs })
      .execute();

    this.logger.log('Dropped default consultation topics.');
  }
}
