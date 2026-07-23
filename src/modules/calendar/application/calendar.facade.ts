import { Injectable } from '@nestjs/common';
import { GetDailyPanchangUseCase } from './use-cases/get-daily-panchang.usecase';
import { GetMonthlyCalendarUseCase } from './use-cases/get-monthly-calendar.usecase';
import { GetYearlyFestivalsUseCase } from './use-cases/get-yearly-festivals.usecase';
import { GetFestivalDetailsUseCase } from './use-cases/get-festival-details.usecase';

@Injectable()
export class CalendarFacade {
  constructor(
    private readonly getDailyPanchangUseCase: GetDailyPanchangUseCase,
    private readonly getMonthlyCalendarUseCase: GetMonthlyCalendarUseCase,
    private readonly getYearlyFestivalsUseCase: GetYearlyFestivalsUseCase,
    private readonly getFestivalDetailsUseCase: GetFestivalDetailsUseCase,
  ) {}

  async getDailyPanchang(
    date: string,
    lat: string,
    lon: string,
    lang: string = 'en',
  ) {
    return this.getDailyPanchangUseCase.execute(date, lat, lon, lang);
  }

  async getMonthlyCalendar(
    year: number,
    month: number,
    lat: string,
    lon: string,
    lang: string = 'en',
  ) {
    return this.getMonthlyCalendarUseCase.execute(year, month, lat, lon, lang);
  }

  async getYearlyFestivals(year: number, lang: string = 'en') {
    return this.getYearlyFestivalsUseCase.execute(year, lang);
  }

  async getFestivalDetails(name: string, lang: string = 'en') {
    return this.getFestivalDetailsUseCase.execute(name, lang);
  }
}
