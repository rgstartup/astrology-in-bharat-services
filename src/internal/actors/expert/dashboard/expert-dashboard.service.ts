import { Injectable } from '@nestjs/common';
import { GetDashboardStatsUseCase } from './use-cases/get-dashboard-stats.use-case';
import { StatsPeriod } from '@/shared/dto/stats-period.dto';

@Injectable()
export class ExpertDashboardService {
  constructor(
    private readonly getDashboardStatsUseCase: GetDashboardStatsUseCase,
  ) {}

  async getDashboardStats(
    expertProfileId: number,
    period?: StatsPeriod,
    startDate?: string,
    endDate?: string,
  ) {
    return this.getDashboardStatsUseCase.execute(
      expertProfileId,
      period,
      startDate,
      endDate,
    );
  }
}
