import { Injectable } from '@nestjs/common';
import { GetGunaMilanUseCase } from './use-cases/get-guna-milan.use-case';
import { GetDailyHoroscopeUseCase } from './use-cases/get-daily-horoscope.use-case';
import { GetMangalDoshaUseCase } from './use-cases/get-mangal-dosha.use-case';
import { GetBirthDetailsUseCase } from './use-cases/get-birth-details.use-case';
import { GetKundliMatchingUseCase } from './use-cases/get-kundli-matching.use-case';
import { GetPanchangUseCase } from './use-cases/get-panchang.use-case';
import { GetPlanetaryPositionsUseCase } from './use-cases/get-planetary-positions.use-case';
import { GetLuckyStatsUseCase } from './use-cases/get-lucky-stats.use-case';
import { GenerateAndSaveKundliReportUseCase } from './use-cases/generate-and-save-kundli-report.use-case';
import { GetMyKundliReportsUseCase } from './use-cases/get-my-kundli-reports.use-case';
import { DeleteKundliReportUseCase } from './use-cases/delete-kundli-report.use-case';
import { GetAstrologyServicesUseCase } from './use-cases/get-astrology-services.use-case';
import { GetAstrologyServicesDto } from './dto/get-astrology-services.dto';

// DTO imports
import { GetGunaMilanDto } from './dto/get-guna-milan.dto';
import { GetDailyHoroscopeDto } from './dto/get-daily-horoscope.dto';
import { GetMangalDoshaDto } from './dto/get-mangal-dosha.dto';
import { GetBirthDetailsDto } from './dto/get-birth-details.dto';
import { GetPanchangDto } from './dto/get-panchang.dto';
import { GetPlanetaryPositionsDto } from './dto/get-planetary-positions.dto';
import { GetLuckyStatsDto } from './dto/get-lucky-stats.dto';
import { GetKundliMatchingDto } from './dto/get-kundli-matching.dto';
import { GenerateKundliReportDto } from './dto/generate-kundli-report.dto';

@Injectable()
export class AstrologyFacade {
  constructor(
    private readonly getGunaMilanUseCase: GetGunaMilanUseCase,
    private readonly getDailyHoroscopeUseCase: GetDailyHoroscopeUseCase,
    private readonly getMangalDoshaUseCase: GetMangalDoshaUseCase,
    private readonly getBirthDetailsUseCase: GetBirthDetailsUseCase,
    private readonly getKundliMatchingUseCase: GetKundliMatchingUseCase,
    private readonly getPanchangUseCase: GetPanchangUseCase,
    private readonly getPlanetaryPositionsUseCase: GetPlanetaryPositionsUseCase,
    private readonly getLuckyStatsUseCase: GetLuckyStatsUseCase,
    private readonly generateAndSaveKundliReportUseCase: GenerateAndSaveKundliReportUseCase,
    private readonly getMyKundliReportsUseCase: GetMyKundliReportsUseCase,
    private readonly deleteKundliReportUseCase: DeleteKundliReportUseCase,
    private readonly getAstrologyServicesUseCase: GetAstrologyServicesUseCase,
  ) {}

  getServices(dto: GetAstrologyServicesDto) {
    return this.getAstrologyServicesUseCase.execute(dto);
  }

  getServiceById(id: string) {
    return this.getAstrologyServicesUseCase.getById(id);
  }

  async getGunaMilan(dto: GetGunaMilanDto): Promise<unknown> {
    return this.getGunaMilanUseCase.execute(dto);
  }

  async getDailyHoroscope(dto: GetDailyHoroscopeDto): Promise<unknown> {
    return this.getDailyHoroscopeUseCase.execute(dto);
  }

  async getMangalDosha(dto: GetMangalDoshaDto): Promise<unknown> {
    return this.getMangalDoshaUseCase.execute(dto);
  }

  async getBirthDetails(dto: GetBirthDetailsDto): Promise<unknown> {
    return this.getBirthDetailsUseCase.execute(dto);
  }

  async getPanchang(dto: GetPanchangDto): Promise<unknown> {
    return this.getPanchangUseCase.execute(dto);
  }

  async getPlanetaryPositions(dto: GetPlanetaryPositionsDto): Promise<unknown> {
    return this.getPlanetaryPositionsUseCase.execute(dto);
  }

  async getKundliMatching(dto: GetKundliMatchingDto): Promise<unknown> {
    return this.getKundliMatchingUseCase.execute(dto);
  }

  getLuckyStats(dto: GetLuckyStatsDto) {
    return this.getLuckyStatsUseCase.execute(dto);
  }

  async generateAndSaveKundliReport(
    clientId: string,
    dto: GenerateKundliReportDto,
  ): Promise<unknown> {
    return this.generateAndSaveKundliReportUseCase.execute(clientId, dto);
  }

  async getMyKundliReports(clientId: string): Promise<unknown> {
    return this.getMyKundliReportsUseCase.execute(clientId);
  }

  async deleteKundliReport(
    clientId: string,
    reportId: string,
  ): Promise<unknown> {
    return this.deleteKundliReportUseCase.execute(clientId, reportId);
  }
}
