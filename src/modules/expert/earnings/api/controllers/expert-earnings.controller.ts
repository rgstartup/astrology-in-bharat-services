import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ExpertEarningsFacade } from '../../application/expert-earnings.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Controller({
    path: 'expert/earnings',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('EXPERT')
export class ExpertEarningsController {
    constructor(private readonly earningsFacade: ExpertEarningsFacade) { }

    @Get('stats')
    getStats(
        @CurrentUser() user: User,
        @Query('period') period: string = 'last_6_months',
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.earningsFacade.getStats(user.id as any, period, startDate, endDate);
    }
}
