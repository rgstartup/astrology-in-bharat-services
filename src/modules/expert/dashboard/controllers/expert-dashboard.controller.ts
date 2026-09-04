import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ExpertDashboardFacade } from '../expert-dashboard.facade';
import { ExpertJwtAuthGuard } from '@/modules/expert/auth/guards/auth.guard';
import { CurrentExpert } from '@/modules/expert/auth/decorators/current-expert.decorator';
import { IExpert } from '@/common/types/access-token.payload';

@Controller({
  path: 'expert-dashboard',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertDashboardController {
  constructor(private readonly dashboardFacade: ExpertDashboardFacade) {}

  @Get('stats')
  async getStats(
    @CurrentExpert() expert: IExpert,
    @Query('type') type: 'today' | 'total',
  ) {
    const stats = await this.dashboardFacade.getDashboardStats(
      expert.sub,
      type || 'today',
    );
    return {
      success: true,
      data: stats,
    };
  }
}
