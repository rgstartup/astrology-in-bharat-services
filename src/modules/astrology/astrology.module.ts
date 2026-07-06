import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AstrologyController } from './api/astrology.controller';
import { ProkeralaModule } from '@/external/prokerala/prokerala.module';
import { AstrologyFacade } from './application/astrology.facade';
import { GetGunaMilanUseCase } from './application/use-cases/get-guna-milan.use-case';
import { GetDailyHoroscopeUseCase } from './application/use-cases/get-daily-horoscope.use-case';
import { GetMangalDoshaUseCase } from './application/use-cases/get-mangal-dosha.use-case';
import { GetBirthDetailsUseCase } from './application/use-cases/get-birth-details.use-case';
import { GetKundliMatchingUseCase } from './application/use-cases/get-kundli-matching.use-case';
import { GetPanchangUseCase } from './application/use-cases/get-panchang.use-case';
import { GetPlanetaryPositionsUseCase } from './application/use-cases/get-planetary-positions.use-case';
import { GetLuckyStatsUseCase } from './application/use-cases/get-lucky-stats.use-case';
import { KundliReport } from './infrastructure/entities/kundli-report.entity';
import { GenerateAndSaveKundliReportUseCase } from './application/use-cases/generate-and-save-kundli-report.use-case';
import { GetMyKundliReportsUseCase } from './application/use-cases/get-my-kundli-reports.use-case';
import { DeleteKundliReportUseCase } from './application/use-cases/delete-kundli-report.use-case';

@Module({
  imports: [ProkeralaModule, TypeOrmModule.forFeature([KundliReport])],
  controllers: [AstrologyController],
  providers: [
    AstrologyFacade,
    GetGunaMilanUseCase,
    GetDailyHoroscopeUseCase,
    GetMangalDoshaUseCase,
    GetBirthDetailsUseCase,
    GetKundliMatchingUseCase,
    GetPanchangUseCase,
    GetPlanetaryPositionsUseCase,
    GetLuckyStatsUseCase,
    GenerateAndSaveKundliReportUseCase,
    GetMyKundliReportsUseCase,
    DeleteKundliReportUseCase,
  ],
  exports: [AstrologyFacade],
})
export class AstrologyModule {}
