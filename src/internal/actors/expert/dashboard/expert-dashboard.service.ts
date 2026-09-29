import { Injectable } from '@nestjs/common';
import { GetDashboardStatsUseCase } from './use-cases/get-dashboard-stats.use-case';

@Injectable()
export class ExpertDashboardService {
  constructor(
    private readonly getDashboardStatsUseCase: GetDashboardStatsUseCase,
  ) {}

  async getDashboardStats(expertProfileId: number, type: 'today' | 'total') {
    return this.getDashboardStatsUseCase.execute(expertProfileId, type);
  }
}
