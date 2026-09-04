import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ExpertEarningsFacade } from '../expert-earnings.facade';
import { ExpertJwtAuthGuard } from '@/modules/expert/auth/guards/auth.guard';
import { CurrentExpert } from '@/modules/expert/auth/decorators/current-expert.decorator';
import { IExpert } from '@/common/types/access-token.payload';
import { GetExpertEarningsStatsDto } from '../dto/get-expert-earnings-stats.dto';

@Controller({
  path: 'expert/earnings',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertEarningsController {
  constructor(private readonly earningsFacade: ExpertEarningsFacade) {}

  @Get('stats')
  getStats(
    @CurrentExpert() expert: IExpert,
    @Query() dto: GetExpertEarningsStatsDto,
  ) {
    return this.earningsFacade.getStats(expert.sub, dto);
  }
}
