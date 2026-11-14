import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RazorpayXPayoutAdapter } from "./razorpayx-payout-adapter";
import { RazorpayXWebhookController } from "./razorpayx-webhook.controller";
import { WalletModule } from "@/internal/finance/wallet/wallet.module";

@Module({
  imports: [ConfigModule, WalletModule],
  providers: [RazorpayXPayoutAdapter],
  controllers: [RazorpayXWebhookController],
  exports: [RazorpayXPayoutAdapter],
})
export class RazorpayXOnboardingModule {}
