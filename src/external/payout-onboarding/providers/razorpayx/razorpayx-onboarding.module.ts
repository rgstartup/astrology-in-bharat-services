import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RazorpayXOnboardingService } from "./razorpayx-onboarding.service";
import { RazorpayXWebhookController } from "./razorpayx-webhook.controller";
import { WalletModule } from "@/internal/finance/wallet/wallet.module";

@Module({
  imports: [ConfigModule, WalletModule],
  providers: [RazorpayXOnboardingService],
  controllers: [RazorpayXWebhookController],
  exports: [RazorpayXOnboardingService],
})
export class RazorpayXOnboardingModule {}
