import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ExpertDashboardFacade } from '../../application/expert-dashboard.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';

@Controller({
  path: 'expert-dashboard',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpertDashboardController {
  constructor(private readonly dashboardFacade: ExpertDashboardFacade) {}

  @Get('stats')
  @Roles('EXPERT', 'CLIENT')
  async getStats(
    @CurrentProfile() expertProfileId: string,
    @Query('type') type: 'today' | 'total',
  ) {
    const stats = await this.dashboardFacade.getDashboardStats(
      expertProfileId,
      type || 'today',
    );
    return {
      success: true,
      data: stats,
    };
  }
}
