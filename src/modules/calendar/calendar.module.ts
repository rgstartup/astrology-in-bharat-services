import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarController } from './api/controllers/calendar.controller';
import { CalendarService } from './application/calendar.service';
import { CalendarCache } from './infrastructure/persistence/entities/calendar-cache.entity';
import { ProkeralaModule } from '@/external/prokerala/prokerala.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CalendarCache]),
    ProkeralaModule,
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
