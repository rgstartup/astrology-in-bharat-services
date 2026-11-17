import { Module, OnModuleInit, Inject } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpClientModule } from "@nestjs/http-client";
import { EventEmitterModule, EventEmitter2 } from "@nestjs/event-emitter";
import type { Duration } from "@nestjs/http-client";
import { EncryptionService } from "@/shared/services/encryption.service";
import { PAYOUT_PROVIDER } from "@/external/payouts/onboarding/payout-provider.interface";
import { PAYOUT_ONBOARDING_SERVICE } from "@/external/payouts/onboarding/payout-onboarding.interface";
import { PayoutProviderModule, PayoutProviderResolver } from "@/external/payouts";
import type { PayoutProvider } from "@/external/payouts/onboarding/payout-provider.interface";
import type { PayoutOnboardingService } from "@/external/payouts/onboarding/payout-onboarding.interface";
import { PayoutAccountsController } from "./controllers/payout-accounts.controller";
import { RazorpayXWebhookController } from "./controllers/razorpayx-webhook.controller";
import { RazorpayXWebhookService } from "./services/razorpayx-webhook.service";
import { PayoutAccountsService } from "./payout-accounts.service";
import { PayoutProviderService } from "./payout-provider.service";
import { RazorpayPayoutService } from "./gateways/razorpay-payout.service";
import { RazorpayXPayoutAdapter } from "./providers/razorpayx/razorpayx-payout-adapter";
import { RazorpayXOnboardingAdapter } from "./providers/razorpayx/razorpayx-onboarding-adapter";
import {
  InitiatePayoutOnboardingUseCase,
  CompletePayoutOnboardingUseCase,
  ExecutePayoutUseCase,
  ReconcilePayoutsUseCase,
} from "./use-cases";

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    PayoutProviderModule,
    HttpClientModule.register({
      baseUrl: "https://api.razorpay.com/v1",
      timeout: 30000 as Duration,
    }),
  ],
  controllers: [PayoutAccountsController, RazorpayXWebhookController],
  providers: [
    PayoutAccountsService,
    PayoutProviderService,
    RazorpayPayoutService,
    RazorpayXPayoutAdapter,
    RazorpayXOnboardingAdapter,
    RazorpayXWebhookService,
    InitiatePayoutOnboardingUseCase,
    CompletePayoutOnboardingUseCase,
    ExecutePayoutUseCase,
    ReconcilePayoutsUseCase,
    EncryptionService,
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
    PayoutAccountsService,
    RazorpayPayoutService,
    RazorpayXPayoutAdapter,
    RazorpayXOnboardingAdapter,
    RazorpayXWebhookService,
    PAYOUT_PROVIDER,
    PAYOUT_ONBOARDING_SERVICE,
    InitiatePayoutOnboardingUseCase,
    CompletePayoutOnboardingUseCase,
    ExecutePayoutUseCase,
    ReconcilePayoutsUseCase,
  ],
})
export class PayoutsAccountsModule implements OnModuleInit {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(PAYOUT_PROVIDER) private readonly payoutProvider: PayoutProvider,
    @Inject(PAYOUT_ONBOARDING_SERVICE) private readonly onboardingService: PayoutOnboardingService,
  ) {}

  onModuleInit(): void {
    this.eventEmitter.emit('payout.provider.registered', {
      provider: this.payoutProvider.provider,
      payoutAdapter: this.payoutProvider,
      onboardingService: this.onboardingService,
    });
  }
}