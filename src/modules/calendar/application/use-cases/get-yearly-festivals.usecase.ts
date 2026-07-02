import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarCache } from '../../infrastructure/entities/calendar-cache.entity';
import { ProkeralaService } from '../../../../external/prokerala/prokerala.service';

@Injectable()
export class GetYearlyFestivalsUseCase {
  private readonly logger = new Logger(GetYearlyFestivalsUseCase.name);

  constructor(
    @InjectRepository(CalendarCache)
    private readonly cacheRepository: Repository<CalendarCache>,
    private readonly prokeralaService: ProkeralaService,
  ) {}

  async execute(year: number, lang: string = 'en') {
    const type = 'festivals';
    const cacheKey = `${year}-${lang}`;

    const cached = await this.cacheRepository.findOne({
      where: { type, cacheKey },
    });
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
