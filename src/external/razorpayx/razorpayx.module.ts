import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpClientModule } from "@nestjs/http-client";
import type { Duration } from "@nestjs/http-client";
import { PAYOUT_PROVIDER } from "@/external/payouts/onboarding/payout-provider.interface";
import { PAYOUT_ONBOARDING_SERVICE } from "@/external/payouts/onboarding/payout-onboarding.interface";
import { RazorpayPayoutService } from "./gateways/razorpay-payout.service";
import { RazorpayXPayoutAdapter } from "./providers/razorpayx-payout-adapter";
import { RazorpayXOnboardingAdapter } from "./providers/razorpayx-onboarding-adapter";
import { RazorpayXWebhookService } from "./services/razorpayx-webhook.service";
import { RazorpayXWebhookController } from "./services/razorpayx-webhook.controller";

@Module({
  imports: [
    ConfigModule,
    HttpClientModule.register({
      baseUrl: "https://api.razorpay.com/v1",
      timeout: 30000 as Duration,
    }),
  ],
  controllers: [RazorpayXWebhookController],
  providers: [
    RazorpayPayoutService,
    RazorpayXPayoutAdapter,
    RazorpayXOnboardingAdapter,
    RazorpayXWebhookService,
    {
      provide: PAYOUT_PROVIDER,
      useExisting: RazorpayXPayoutAdapter,
    },
    {
      provide: PAYOUT_ONBOARDING_SERVICE,
      useExisting: RazorpayXOnboardingAdapter,
    },
  ],
  exports: [
    RazorpayPayoutService,
    RazorpayXPayoutAdapter,
    RazorpayXOnboardingAdapter,
    RazorpayXWebhookService,
    PAYOUT_PROVIDER,
    PAYOUT_ONBOARDING_SERVICE,
  ],
})
export class RazorpayXModule {}
