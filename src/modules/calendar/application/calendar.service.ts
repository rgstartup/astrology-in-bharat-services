import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarCache } from '../infrastructure/persistence/entities/calendar-cache.entity';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(CalendarCache)
    private readonly cacheRepository: Repository<CalendarCache>,
    private readonly prokeralaService: ProkeralaService,
  ) {}

  async getMonthlyCalendar(year: number, month: number, locationId: string = '123', lang: string = 'en') {
    const type = 'monthly';
    const cacheKey = `${year}-${month}-${locationId}-${lang}`;
    
    const cached = await this.cacheRepository.findOne({ where: { type, cacheKey } });
    if (cached) {
      this.logger.log(`Serving cached monthly calendar for ${cacheKey}`);
      return cached.response;
    }

    this.logger.log(`Fetching fresh monthly calendar for ${cacheKey}`);
    // Prokerala Monthly Panchang needs a datetime in that month
    const datetime = `${year}-${month.toString().padStart(2, 'x').replace('x', month < 10 ? '0' : '')}-01T00:00:00+05:30`;
    // Fix padding logic
    const paddedMonth = month.toString().padStart(2, '0');
    const isoDate = `${year}-${paddedMonth}-01T00:00:00+05:30`;

    const response = await this.prokeralaService.getPanchangMonthly({
      datetime: isoDate,
      locationId: locationId || '123',
      lang,
    });

    const newCache = this.cacheRepository.create({
      type,
      cacheKey,
      response,
    });
    await this.cacheRepository.save(newCache);

    return response;
  }

  async getDailyPanchang(date: string, lat: string, lon: string, lang: string = 'en') {
    const type = 'daily';
    const cacheKey = `${date}-${lat}-${lon}-${lang}`;

    const cached = await this.cacheRepository.findOne({ where: { type, cacheKey } });
    if (cached) {
      this.logger.log(`Serving cached daily panchang for ${cacheKey}`);
      return cached.response;
    }

    this.logger.log(`Fetching fresh daily panchang for ${cacheKey}`);
    const datetime = `${date}T00:00:00+05:30`;
    const response = await this.prokeralaService.getPanchangDaily({
      datetime,
      lat,
      lon,
      lang,
    });

    const newCache = this.cacheRepository.create({
      type,
      cacheKey,
      response,
    });
    await this.cacheRepository.save(newCache);

    return response;
  }

  async getYearlyFestivals(year: number, lang: string = 'en') {
    const type = 'festivals';
    const cacheKey = `${year}-${lang}`;

    const cached = await this.cacheRepository.findOne({ where: { type, cacheKey } });
    if (cached) {
      this.logger.log(`Serving cached yearly festivals for ${cacheKey}`);
      return cached.response;
    }

    this.logger.log(`Fetching fresh yearly festivals for ${cacheKey}`);
    const response = await this.prokeralaService.getFestivals(year, lang);

    const newCache = this.cacheRepository.create({
      type,
      cacheKey,
      response,
    });
    await this.cacheRepository.save(newCache);

    return response;
  }
}
