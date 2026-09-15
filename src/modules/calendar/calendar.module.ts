import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarController } from './controllers/calendar.controller';
import { CalendarFacade } from './calendar.facade';
import { GetDailyPanchangUseCase } from './use-cases/get-daily-panchang.usecase';
import { GetMonthlyCalendarUseCase } from './use-cases/get-monthly-calendar.usecase';
import { GetYearlyFestivalsUseCase } from './use-cases/get-yearly-festivals.usecase';
import { GetFestivalDetailsUseCase } from './use-cases/get-festival-details.usecase';
import { PanchangamService } from './services/panchangam.service';
import { CalendarCache } from './entities/calendar-cache.entity';
import { ProkeralaModule } from '@/external/prokerala/prokerala.module';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarCache]), ProkeralaModule],
  controllers: [CalendarController],
  providers: [
    CalendarFacade,
    GetDailyPanchangUseCase,
    GetMonthlyCalendarUseCase,
    GetYearlyFestivalsUseCase,
    GetFestivalDetailsUseCase,
    PanchangamService,
  ],
  exports: [CalendarFacade],
})
export class CalendarModule {}
