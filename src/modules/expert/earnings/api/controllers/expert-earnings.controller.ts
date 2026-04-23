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
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

@Controller({
    path: 'expert/earnings',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('expert')
export class ExpertEarningsController {
    constructor(private readonly earningsFacade: ExpertEarningsFacade) { }

    @Get('stats')
    getStats(
        @CurrentUser() user: AuthenticatedUser,
        @Query('range') range: string = 'last_6_months',
    ) {
        return this.earningsFacade.getStats(user.id, range);
    }
}
