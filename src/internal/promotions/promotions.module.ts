import { Module } from '@nestjs/common';

import { AdminPromotionsController } from './admin-promotions.controller';
import { ClientPromotionsController } from './client-promotions.controller';
import { PromotionsService } from './promotions.service';

/**
 * Versioned promotions & free consultation minutes
 * (spec: WELCOME_CHAT_5). Exports the service so registration usecases,
 * eligibility and the consultation settlement can share one source of
 * benefit truth.
 */
@Module({
  controllers: [ClientPromotionsController, AdminPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
