import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarController } from './api/controllers/calendar.controller';
import { CalendarFacade } from './application/calendar.facade';
import { GetDailyPanchangUseCase } from './application/use-cases/get-daily-panchang.usecase';
import { GetMonthlyCalendarUseCase } from './application/use-cases/get-monthly-calendar.usecase';
import { GetYearlyFestivalsUseCase } from './application/use-cases/get-yearly-festivals.usecase';
import { CalendarCache } from './infrastructure/entities/calendar-cache.entity';
import { ProkeralaModule } from '@/external/prokerala/prokerala.module';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarCache]), ProkeralaModule],
  controllers: [CalendarController],
  providers: [
    CalendarFacade,
    GetDailyPanchangUseCase,
    GetMonthlyCalendarUseCase,
    GetYearlyFestivalsUseCase,
  ],
  exports: [CalendarFacade],
})
export class CalendarModule {}
