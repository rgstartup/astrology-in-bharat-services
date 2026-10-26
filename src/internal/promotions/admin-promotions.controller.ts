import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/internal/auth/guards/auth.guard';
import { RolesGuard } from '@/internal/auth/guards/role.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { PromotionsService } from './promotions.service';

@Controller({
  path: 'admin/promotions',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class AdminPromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  /** Cumulative promotional loss view across settled consultations. */
  @Get('loss-stats')
  async getLossStats() {
    return this.promotions.getLossStats();
  }
}
