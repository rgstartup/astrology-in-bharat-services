import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarCache } from '../../infrastructure/entities/calendar-cache.entity';
import { PanchangamService } from '../services/panchangam.service';

@Injectable()
export class GetMonthlyCalendarUseCase {
  private readonly logger = new Logger(GetMonthlyCalendarUseCase.name);

  constructor(
    @InjectRepository(CalendarCache)
    private readonly cacheRepository: Repository<CalendarCache>,
    private readonly panchangamService: PanchangamService,
  ) {}

  async execute(
    year: number,
    month: number,
    lat: string,
    lon: string,
    lang: string = 'en',
  ) {
    const type = 'monthly-local';
    const cacheKey = `${year}-${month}-${lang}-v1`;

    const cached = await this.cacheRepository.findOne({
      where: { type, cacheKey },
    });
    if (cached) {
      this.logger.log(`Serving cached monthly calendar for ${cacheKey}`);
      return cached.response;
    }

    this.logger.log(`Calculating fresh monthly calendar for ${cacheKey} locally`);

    // Fetch yearly festivals from local service
    let festivalsRaw: any = {};
    try {
      const festivalCacheKey = `${year}-${lang}-v1`;
      const festivalCacheType = 'festivals-local';
      const cachedFestivals = await this.cacheRepository.findOne({
        where: { type: festivalCacheType, cacheKey: festivalCacheKey },
      });

      if (cachedFestivals) {
        festivalsRaw = cachedFestivals.response;
      } else {
        const festivalResponse = this.panchangamService.getYearlyFestivals(year);
        festivalsRaw = { data: festivalResponse };
        const newFestivalCache = this.cacheRepository.create({
          type: festivalCacheType,
          cacheKey: festivalCacheKey,
          response: festivalsRaw,
        });
        await this.cacheRepository.save(newFestivalCache);
      }
    } catch (e) {
      this.logger.error('Failed to calculate yearly festivals', e);
    }

    const festivalsList = (festivalsRaw?.data || []) as any[];

    const lastDay = new Date(year, month, 0).getDate();
    const monthlyData: any[] = [];
    const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (let day = 1; day <= lastDay; day++) {
      const paddedDay = day.toString().padStart(2, '0');
      const paddedMonth = month.toString().padStart(2, '0');
      const dateStr = `${year}-${paddedMonth}-${paddedDay}`;
      
      const dateObj = new Date(year, month - 1, day);
      const dayName = WEEKDAYS[dateObj.getDay()];

      const dayFestivals = festivalsList
        .filter((f) => f.date && f.date.startsWith(dateStr))
        .map((f) => f.name);

      // We can also calculate Ekadashi, Amavasya, Purnima here if we need, 
      // but the festival list from panchangam-js usually includes them!
      
      monthlyData.push({
        date: dateStr,
        dayName,
        festivals: dayFestivals,
      });
    }

    const newCache = this.cacheRepository.create({
      type,
      cacheKey,
      response: monthlyData,
    });
    await this.cacheRepository.save(newCache);

    return monthlyData;
  }
}
