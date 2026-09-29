import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ExpertDashboardService } from '../expert-dashboard.service';
import { ExpertJwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentExpert } from '../../auth/decorators/current-expert.decorator';
import { type IExpert } from '../../../../../shared/types/access-token.payload';

@Controller({
  path: 'expert-dashboard',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertDashboardController {
  constructor(private readonly dashboardService: ExpertDashboardService) {}

  @Get('stats')
  async getStats(
    @CurrentExpert() expert: IExpert,
    @Query('type') type: 'today' | 'total',
  ) {
    const stats = await this.dashboardService.getDashboardStats(
      expert.sub,
      type || 'today',
    );
    return {
      success: true,
      data: stats,
    };
  }
}
