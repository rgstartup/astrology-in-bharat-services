import {
    Controller,
    Get,
    Query,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { ExpertEarningsService } from './earnings.service';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';

@Controller({
    path: 'expert/earnings',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('expert')
export class ExpertEarningsController {
    constructor(private readonly earningsService: ExpertEarningsService) { }

    @Get('stats')
    getStats(
        @CurrentUser() user: User,
        @Query('range') range: string = 'last_6_months',
    ) {
        return this.earningsService.getStats(user.id, range);
    }
}
