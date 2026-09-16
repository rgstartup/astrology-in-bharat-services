import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { AstrologyService } from '@/modules/astrology/entities/astrology-service.entity';

export class AstrologyServiceSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const repository = dataSource.getRepository(AstrologyService);

    const services = [
      {
        slug: 'kundli-matching',
        title: 'Kundali Matching (Gun Milan)',
        description:
          'In-depth 36 Guna Milan compatibility analysis, Manglik Dosh evaluation, and relationship harmony remedies.',
        icon: 'fa-solid fa-people-arrows',
        image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552',
        delivery_type: 'REPORT_PDF',
        suggested_duration_mins: 30,
        sort_order: 1,
        is_active: true,
      },
      {
        slug: 'life-horoscope-report',
        title: 'Comprehensive Life Horoscope Report',
        description:
          'Detailed 50+ page lifetime astrological breakdown covering all 12 houses, Mahadasha, Antardasha, Sade Sati, and personalized remedies.',
        icon: 'fa-solid fa-scroll',
        image_url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765',
        delivery_type: 'REPORT_PDF',
        suggested_duration_mins: 45,
        sort_order: 2,
        is_active: true,
      },
      {
        slug: 'numerology-name-correction',
        title: 'Numerology Name Correction & Destiny Report',
        description:
          'Analysis of your Mulank (Birth Number) and Bhagyank (Destiny Number) with scientifically corrected spelling for career, health, and fame.',
        icon: 'fa-solid fa-hashtag',
        image_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904',
        delivery_type: 'REPORT_PDF',
        suggested_duration_mins: 30,
        sort_order: 3,
        is_active: true,
      },
      {
        slug: 'career-wealth-forecast',
        title: 'Career & Financial Growth Forecast',
        description:
          'Analysis of 2nd, 10th, and 11th houses along with the D10 Dashamsha chart for ideal career transitions, promotions, and investment windows.',
        icon: 'fa-solid fa-briefcase',
        image_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b',
        delivery_type: 'REPORT_PDF',
        suggested_duration_mins: 30,
        sort_order: 4,
        is_active: true,
      },
      {
        slug: 'gemstone-recommendation',
        title: 'Gemstone (Ratna) Recommendation & Energization Guide',
        description:
          'Identification of your most auspicious life gemstone, recommended carat weight, metal, and precise energization ritual.',
        icon: 'fa-solid fa-gem',
        image_url: 'https://images.unsplash.com/photo-1600003014755-ba31aa59c4b6',
        delivery_type: 'REPORT_PDF',
        suggested_duration_mins: 20,
        sort_order: 5,
        is_active: true,
      },
      {
        slug: 'birth-time-rectification',
        title: 'Birth Time Rectification (BTR)',
        description:
          'Astrological calculation to pin down the exact minute of birth using landmark life events when the birth time is uncertain.',
        icon: 'fa-solid fa-clock-rotate-left',
        image_url: 'https://images.unsplash.com/photo-1501139083538-0139583c060f',
        delivery_type: 'LIVE_CONSULTATION',
        suggested_duration_mins: 45,
        sort_order: 6,
        is_active: true,
      },
      {
        slug: 'child-education-horoscope',
        title: 'Child & Education Astrology Report',
        description:
          'Analysis of the 5th house of intellect, suitable academic streams, competitive exam timings, and concentration remedies for children.',
        icon: 'fa-solid fa-graduation-cap',
        image_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b',
        delivery_type: 'REPORT_PDF',
        suggested_duration_mins: 30,
        sort_order: 7,
        is_active: true,
      },
      {
        slug: 'prashna-kundali',
        title: 'Prashna Kundali (Horary Astrology Consultation)',
        description:
          'Immediate astrological reading for a specific, urgent question answered via the Prashna chart when birth details are unavailable.',
        icon: 'fa-solid fa-circle-question',
        image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
        delivery_type: 'LIVE_CONSULTATION',
        suggested_duration_mins: 20,
        sort_order: 8,
        is_active: true,
      },
      {
        slug: 'vastu-video-consultation',
        title: 'Live Vastu Video Walkthrough & Remedies',
        description:
          'Walkthrough of your home or commercial premises via live video call with real-time directional remedies without structural demolition.',
        icon: 'fa-solid fa-compass-drafting',
        image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
        delivery_type: 'LIVE_CONSULTATION',
        suggested_duration_mins: 45,
        sort_order: 9,
        is_active: true,
      },
      {
        slug: 'yearly-varshphal-report',
        title: 'Yearly Varshphal (Solar Return) Forecast',
        description:
          'Month-by-month prediction for the next 12 months calculated through Tajik Varshphal, Muntha position, and annual dasha.',
        icon: 'fa-solid fa-calendar-days',
        image_url: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe',
        delivery_type: 'REPORT_PDF',
        suggested_duration_mins: 30,
        sort_order: 10,
        is_active: true,
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const data of services) {
      let existing = await repository.findOne({ where: { slug: data.slug } });

      if (existing) {
        Object.assign(existing, data);
        await repository.save(existing);
        updatedCount++;
      } else {
        const created = repository.create(data);
        await repository.save(created);
        createdCount++;
      }
    }

    console.log(
      `[AstrologyServiceSeeder] Finished. Created: ${createdCount}, Updated: ${updatedCount} (Total: ${services.length}).`,
    );
  }
}
