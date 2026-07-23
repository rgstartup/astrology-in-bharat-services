import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarCache } from '../../infrastructure/entities/calendar-cache.entity';
import { PanchangamService } from '../services/panchangam.service';

@Injectable()
export class GetYearlyFestivalsUseCase {
  private readonly logger = new Logger(GetYearlyFestivalsUseCase.name);

  constructor(
    @InjectRepository(CalendarCache)
    private readonly cacheRepository: Repository<CalendarCache>,
    private readonly panchangamService: PanchangamService,
  ) {}

  async execute(year: number, lang: string = 'en') {
    const type = 'festivals-local';
    const cacheKey = `${year}-${lang}-v1`;

    const cached = await this.cacheRepository.findOne({
      where: { type, cacheKey },
    });
    if (cached) {
      this.logger.log(`Serving cached yearly festivals for ${cacheKey}`);
      return cached.response;
    }

    this.logger.log(`Calculating fresh yearly festivals for ${cacheKey} locally`);
    const festivals = this.panchangamService.getYearlyFestivals(year);
    
    // We format it like Prokerala response so frontend doesn't break if expecting `.data`
    const response = { data: festivals };

    try {
      await this.cacheRepository.upsert(
        {
          type,
          cacheKey,
          response,
        },
        ['type', 'cacheKey']
      );
    } catch (e: any) {
      if (e.code !== '23505') {
        this.logger.warn(`Failed to cache yearly festivals: ${e.message}`);
      }
    }

    return response;
  }
}
