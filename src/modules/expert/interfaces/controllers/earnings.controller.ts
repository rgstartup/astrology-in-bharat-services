import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { User } from '@/modules/users/domain/entities/user.entity';
import { ExpertEarningsService } from '../../application/services/earnings.service';

@Controller({
    path: 'expert/earnings',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('expert')
export class ExpertEarningsController {
    constructor(private readonly earningsService: ExpertEarningsService) { }

    @Get('stats')
    async getStats(
        @CurrentUser() user: User,
        @Query('range') range: string = 'last_6_months',
    ) {
        const stats = await this.earningsService.getStats(user.id, range);
        return {
            success: true,
            data: stats,
        };
    }
}
