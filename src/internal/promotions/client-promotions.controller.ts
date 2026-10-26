import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClientJwtAuthGuard } from '@/internal/actors/client/auth/guards/auth.guard';
import { CurrentClient } from '@/internal/actors/client/auth/decorators/current-client.decorator';
import { PromotionsService } from './promotions.service';

@Controller({
  path: 'client/promotions',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class ClientPromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  /** Active promotion balance for the signed-in client. */
  @Get('active')
  async getActivePromotions(
    @CurrentClient('id') clientId: number,
  ) {
    const promotions = await this.promotions.getActivePromotions(clientId);
    const remainingSeconds = await this.promotions.getActiveChatBenefitSeconds(
      clientId,
    );
    return { promotions, remainingSeconds };
  }
}
