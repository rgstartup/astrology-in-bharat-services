import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { ExpertDashboardService } from '../../application/services/expert-dashboard.service';
import { JwtAuthGuard, RolesGuard } from '@/modules/auth';
import { Roles } from '@/common/decorators/roles.decorator';

@Controller({
    path: 'expert-dashboard',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpertDashboardController {
    constructor(private readonly dashboardService: ExpertDashboardService) { }

    @Get('stats')
    @Roles('expert')
    async getStats(@Req() req: any, @Query('type') type: 'today' | 'total') {
        const userId = req.user.id;
        const stats = await this.dashboardService.getDashboardStats(
            userId,
            type || 'today',
        );
        return {
            success: true,
            data: stats,
        };
    }
}
