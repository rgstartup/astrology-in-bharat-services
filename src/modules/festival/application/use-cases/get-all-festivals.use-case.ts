import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Festival } from '../../infrastructure/entities/festival.entity';

@Injectable()
export class GetAllFestivalsUseCase {
  private readonly cache = new Map<string, any[]>();

  constructor(
    @InjectRepository(Festival)
    private readonly festivalRepo: Repository<Festival>,
  ) {}

  async execute(year?: number, month?: number) {
    const targetYear = year || new Date().getFullYear();
    const cacheKey = `${targetYear}`;

    let festivals = this.cache.get(cacheKey);

    if (!festivals) {
      try {
        const url = `https://jayantur13.github.io/calendar-bharat/calendar/${targetYear}.json`;
        console.log(`[GetAllFestivalsUseCase] Fetching from: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
          console.warn(
            `[GetAllFestivalsUseCase] API returned status: ${response.status}`,
          );
          throw new Error('Failed to fetch from external source');
        }

        const data = await response.json();

        // The API returns a nested object: { "2026": { "January 2026": { "Date String": { ... } } } }
        const yearData = data[targetYear] || data[`${targetYear}`];
        if (!yearData) {
          console.warn(
            `[GetAllFestivalsUseCase] No data found for year ${targetYear}`,
          );
          festivals = [];
        } else {
          const flattened: any[] = [];
          // Loop through months
          Object.keys(yearData).forEach((monthKey) => {
            const monthData = yearData[monthKey];
            // Loop through dates
            Object.keys(monthData).forEach((dateStr) => {
              const item = monthData[dateStr];

              // The date string is like "January 1, 2026, Thursday"
              const cleanDateStr = dateStr.split(',').slice(0, 2).join(',');

              flattened.push({
                id: Math.random(),
                name: item.event,
                description: item.extras || item.type,
                date: new Date(cleanDateStr),
                type: item.type?.toLowerCase().includes('holiday')
                  ? 'holiday'
                  : 'festival',
                image_url: null,
              });
            });
          });
          festivals = flattened;
        }

        console.log(
          `[GetAllFestivalsUseCase] Processed ${festivals.length} items from API`,
        );
        this.cache.set(cacheKey, festivals);
      } catch (error) {
        console.error('[GetAllFestivalsUseCase] Fetch Error:', error.message);
        // Fallback to database
        festivals = await this.festivalRepo.find({ order: { date: 'ASC' } });
      }
    }

    if (month) {
      return festivals.filter((f) => {
        const d = new Date(f.date);
        return d.getMonth() + 1 === month;
      });
    }

    return festivals;
  }
}
