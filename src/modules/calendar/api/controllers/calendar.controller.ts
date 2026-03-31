import { Controller, Get, Query } from '@nestjs/common';
import { CalendarService } from '../../application/calendar.service';
import { Public } from '@/common/decorators/public.decorator';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Public()
  @Get('monthly')
  async getMonthly(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('location_id') locationId: string,
    @Query('lang') lang: string = 'en',
  ) {
    return this.calendarService.getMonthlyCalendar(
      parseInt(year),
      parseInt(month),
      locationId,
      lang,
    );
  }

  @Public()
  @Get('panchang/daily')
  async getDaily(
    @Query('date') date: string,
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('lang') lang: string = 'en',
  ) {
    return this.calendarService.getDailyPanchang(date, lat, lon, lang);
  }

  @Public()
  @Get('festivals')
  async getFestivals(
    @Query('year') year: string,
    @Query('lang') lang: string = 'en',
  ) {
    return this.calendarService.getYearlyFestivals(parseInt(year), lang);
  }
}
