/**
 * Payout provider module.
 *
 * Registers the RazorpayX payout provider adapter and the capability-based
 * resolver. Use-cases inject `PAYOUT_PROVIDER` (resolved to the active
 * provider) or `PayoutProviderResolver` directly.
 *
 * On module init, the RazorpayX adapter is registered with the resolver so
 * that `resolver.resolve('razorpayx')` returns the configured provider.
 */
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RazorpayXPayoutAdapter } from './providers/razorpayx/razorpayx-payout-adapter';
import { PayoutProviderResolver } from './payout-provider.resolver';
import { PAYOUT_PROVIDER } from './payout-provider.interface';
import { RazorpayXWebhookController } from './providers/razorpayx/razorpayx-webhook.controller';
import { WalletModule } from '@/internal/finance/wallet/wallet.module';

@Module({
  imports: [ConfigModule, WalletModule],
  providers: [
    RazorpayXPayoutAdapter,
    {
      provide: PAYOUT_PROVIDER,
      useExisting: RazorpayXPayoutAdapter,
    },
    PayoutProviderResolver,
  ],
  controllers: [RazorpayXWebhookController],
  exports: [PAYOUT_PROVIDER, PayoutProviderResolver, RazorpayXPayoutAdapter],
})
export class PayoutProviderModule implements OnModuleInit {
  private readonly logger = new Logger(PayoutProviderModule.name);

  constructor(
    private readonly adapter: RazorpayXPayoutAdapter,
    private readonly resolver: PayoutProviderResolver,
  ) {}

  onModuleInit(): void {
    this.resolver.register(this.adapter);
    this.logger.log(
      `Registered payout provider: ${this.adapter.provider} (caps: ${this.adapter.capabilities.capabilities.join(', ')})`,
    );
  }
}
