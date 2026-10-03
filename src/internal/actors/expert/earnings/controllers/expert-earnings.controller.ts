import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ExpertEarningsService } from '../expert-earnings.service';
import { ExpertJwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentExpert } from '../../auth/decorators/current-expert.decorator';
import { type IExpert } from '@/shared/types/access-token.payload';
import { GetExpertEarningsStatsDto } from '../dto/get-expert-earnings-stats.dto';

@Controller({
  path: 'expert/earnings',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertEarningsController {
  constructor(private readonly earningsService: ExpertEarningsService) {}

  @Get('stats')
  getStats(
    @CurrentExpert() expert: IExpert,
    @Query() dto: GetExpertEarningsStatsDto,
  ) {
    return this.earningsService.getStats(expert.sub, dto);
  }
}
