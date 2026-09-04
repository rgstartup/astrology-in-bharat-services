import { Injectable } from '@nestjs/common';
import { GetDashboardStatsUseCase } from './use-cases/get-dashboard-stats.use-case';

@Injectable()
export class ExpertDashboardFacade {
  constructor(
    private readonly getDashboardStatsUseCase: GetDashboardStatsUseCase,
  ) {}

  async getDashboardStats(expertProfileId: string, type: 'today' | 'total') {
    return this.getDashboardStatsUseCase.execute(expertProfileId, type);
  }
}
