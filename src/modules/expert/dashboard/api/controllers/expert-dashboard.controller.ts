import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { ExpertDashboardFacade } from '../../application/expert-dashboard.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@Controller({
    path: 'expert-dashboard',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpertDashboardController {
    constructor(private readonly dashboardFacade: ExpertDashboardFacade) { }

    @Get('stats')
    @Roles('expert')
    async getStats(@Req() req: any, @Query('type') type: 'today' | 'total') {
        const userId = req.user.id;
        const stats = await this.dashboardFacade.getDashboardStats(
            userId,
            type || 'today',
        );
        return {
            success: true,
            data: stats,
        };
    }
}
