import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AstrologyController } from './controllers/astrology.controller';
import { ProkeralaModule } from '@/external/prokerala/prokerala.module';
import { AstrologyFacade } from './astrology.facade';
import { GetGunaMilanUseCase } from './use-cases/get-guna-milan.use-case';
import { GetDailyHoroscopeUseCase } from './use-cases/get-daily-horoscope.use-case';
import { GetMangalDoshaUseCase } from './use-cases/get-mangal-dosha.use-case';
import { GetBirthDetailsUseCase } from './use-cases/get-birth-details.use-case';
import { GetKundliMatchingUseCase } from './use-cases/get-kundli-matching.use-case';
import { GetPanchangUseCase } from './use-cases/get-panchang.use-case';
import { GetPlanetaryPositionsUseCase } from './use-cases/get-planetary-positions.use-case';
import { GetLuckyStatsUseCase } from './use-cases/get-lucky-stats.use-case';
import { KundliReport } from './entities/kundli-report.entity';
import { AstrologyService } from './entities/astrology-service.entity';
import { GenerateAndSaveKundliReportUseCase } from './use-cases/generate-and-save-kundli-report.use-case';
import { GetMyKundliReportsUseCase } from './use-cases/get-my-kundli-reports.use-case';
import { DeleteKundliReportUseCase } from './use-cases/delete-kundli-report.use-case';
import { GetAstrologyServicesUseCase } from './use-cases/get-astrology-services.use-case';

@Module({
  imports: [
    ProkeralaModule,
    TypeOrmModule.forFeature([KundliReport, AstrologyService]),
  ],
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
    GetAstrologyServicesUseCase,
  ],
  exports: [AstrologyFacade, TypeOrmModule],
})
export class AstrologyModule {}
