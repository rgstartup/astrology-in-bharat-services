import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ExpertDashboardFacade } from '../../application/expert-dashboard.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

@Controller({
    path: 'expert-dashboard',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpertDashboardController {
    constructor(private readonly dashboardFacade: ExpertDashboardFacade) { }

    @Get('stats')
    @Roles('expert')
    async getStats(@CurrentUser() user: AuthenticatedUser, @Query('type') type: 'today' | 'total') {
        const stats = await this.dashboardFacade.getDashboardStats(
            user.id,
            type || 'today',
        );
        return {
            success: true,
            data: stats,
        };
    }
}
