import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RazorpayXPayoutAdapter } from "@/internal/actors/expert/payout-accounts/providers/razorpayx/razorpayx-payout-adapter";
import { RazorpayXWebhookController } from "./razorpayx-webhook.controller";

@Module({
  imports: [ConfigModule],
  providers: [RazorpayXPayoutAdapter],
  controllers: [RazorpayXWebhookController],
  exports: [RazorpayXPayoutAdapter],
})
export class RazorpayXOnboardingModule {}
