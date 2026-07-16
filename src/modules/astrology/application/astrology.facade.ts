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

// DTO imports
import { GetGunaMilanDto } from '../api/dto/get-guna-milan.dto';
import { GetDailyHoroscopeDto } from '../api/dto/get-daily-horoscope.dto';
import { GetMangalDoshaDto } from '../api/dto/get-mangal-dosha.dto';
import { GetBirthDetailsDto } from '../api/dto/get-birth-details.dto';
import { GetPanchangDto } from '../api/dto/get-panchang.dto';
import { GetPlanetaryPositionsDto } from '../api/dto/get-planetary-positions.dto';
import { GetLuckyStatsDto } from '../api/dto/get-lucky-stats.dto';
import { GetKundliMatchingDto } from '../api/dto/get-kundli-matching.dto';
import { GenerateKundliReportDto } from '../api/dto/generate-kundli-report.dto';

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
  ) {}

  async getGunaMilan(dto: GetGunaMilanDto) {
    return this.getGunaMilanUseCase.execute(dto);
  }

  async getDailyHoroscope(dto: GetDailyHoroscopeDto) {
    return this.getDailyHoroscopeUseCase.execute(dto);
  }

  async getMangalDosha(dto: GetMangalDoshaDto) {
    return this.getMangalDoshaUseCase.execute(dto);
  }

  async getBirthDetails(dto: GetBirthDetailsDto) {
    return this.getBirthDetailsUseCase.execute(dto);
  }

  async getPanchang(dto: GetPanchangDto) {
    return this.getPanchangUseCase.execute(dto);
  }

  async getPlanetaryPositions(dto: GetPlanetaryPositionsDto) {
    return this.getPlanetaryPositionsUseCase.execute(dto);
  }

  async getKundliMatching(dto: GetKundliMatchingDto) {
    return this.getKundliMatchingUseCase.execute(dto);
  }

  getLuckyStats(dto: GetLuckyStatsDto) {
    return this.getLuckyStatsUseCase.execute(dto);
  }

  async generateAndSaveKundliReport(
    clientId: string,
    dto: GenerateKundliReportDto,
  ) {
    return this.generateAndSaveKundliReportUseCase.execute(clientId, dto);
  }

  async getMyKundliReports(clientId: string) {
    return this.getMyKundliReportsUseCase.execute(clientId);
  }

  async deleteKundliReport(clientId: string, reportId: string) {
    return this.deleteKundliReportUseCase.execute(clientId, reportId);
  }
}
