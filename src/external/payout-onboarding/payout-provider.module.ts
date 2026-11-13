/**
 * Payout provider module.
 *
 * Registers the RazorpayX payout provider adapter and the capability-based
 * resolver. Use-cases inject `PAYOUT_PROVIDER` (resolved to the active
 * provider) or `PayoutProviderResolver` directly.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RazorpayXPayoutAdapter } from './providers/razorpayx/razorpayx-payout-adapter';
import { PayoutProviderResolver } from './payout-provider.resolver';
import { PAYOUT_PROVIDER } from './payout-provider.interface';
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
  exports: [PAYOUT_PROVIDER, PayoutProviderResolver, RazorpayXPayoutAdapter],
})
export class PayoutProviderModule {}
