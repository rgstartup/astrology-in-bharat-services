/**
 * Payout provider module.
 *
 * Provides the `PayoutProviderResolver` for capability-based provider selection.
 * Does NOT provide `PAYOUT_PROVIDER` — that token is provided by the owning
 * module (e.g., PayoutAccountsModule) which registers the concrete adapters.
 */
import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayoutProviderResolver } from './payout-provider.resolver';

@Module({
  imports: [ConfigModule],
  providers: [PayoutProviderResolver],
  exports: [PayoutProviderResolver],
})
export class PayoutProviderModule {
  private readonly logger = new Logger(PayoutProviderModule.name);

  constructor() {
    this.logger.log('PayoutProviderModule initialized — resolver exported, PAYOUT_PROVIDER provided by owner module');
  }
}
