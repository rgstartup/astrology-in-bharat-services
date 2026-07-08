import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ExpertEarningsFacade } from '../../application/expert-earnings.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { GetExpertEarningsStatsDto } from '../dto/get-expert-earnings-stats.dto';

@Controller({
  path: 'expert/earnings',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('EXPERT')
export class ExpertEarningsController {
  constructor(private readonly earningsFacade: ExpertEarningsFacade) {}

  @Get('stats')
  getStats(
    @CurrentProfile() expertProfileId: string,
    @Query() dto: GetExpertEarningsStatsDto,
  ) {
    return this.earningsFacade.getStats(expertProfileId, dto);
  }
}
