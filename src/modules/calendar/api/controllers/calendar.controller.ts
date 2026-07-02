import { Controller, Get, Query } from '@nestjs/common';
import { CalendarFacade } from '../../application/calendar.facade';
import { Public } from '@/common/decorators/public.decorator';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarFacade: CalendarFacade) {}

  @Public()
  @Get('monthly')
  async getMonthly(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('lang') lang: string = 'en',
  ) {
    return this.calendarFacade.getMonthlyCalendar(
      parseInt(year),
      parseInt(month),
      lat,
      lon,
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
    return this.calendarFacade.getDailyPanchang(date, lat, lon, lang);
  }

  @Public()
  @Get('festivals')
  async getFestivals(
    @Query('year') year: string,
    @Query('lang') lang: string = 'en',
  ) {
    return this.calendarFacade.getYearlyFestivals(parseInt(year), lang);
  }
}
