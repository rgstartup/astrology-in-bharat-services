import { Module, OnModuleInit, Inject } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpClientModule } from "@nestjs/http-client";
import { EventEmitterModule, EventEmitter2 } from "@nestjs/event-emitter";
import type { Duration } from "@nestjs/http-client";
import { EncryptionService } from "@/shared/services/encryption.service";
import { PAYOUT_PROVIDER } from "@/external/payouts/onboarding/payout-provider.interface";
import { PAYOUT_ONBOARDING_SERVICE } from "@/external/payouts/onboarding/payout-onboarding.interface";
import { PayoutProviderModule, PayoutProviderResolver } from "@/external/payouts";
import { RazorpayXModule } from "@/external/razorpayx/razorpayx.module";
import type { PayoutProvider } from "@/external/payouts/onboarding/payout-provider.interface";
import type { PayoutOnboardingService } from "@/external/payouts/onboarding/payout-onboarding.interface";
import { PayoutAccountsController } from "./controllers/payout-accounts.controller";
import { PayoutAccountsService } from "./payout-accounts.service";
import { PayoutProviderService } from "./payout-provider.service";
import {
  InitiatePayoutOnboardingUseCase,
  CompletePayoutOnboardingUseCase,
  ExecutePayoutUseCase,
  ReconcilePayoutsUseCase,
  ListPayoutLinksUseCase,
} from "./use-cases";

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    PayoutProviderModule,
    RazorpayXModule,
    HttpClientModule.register({
      baseUrl: "https://api.razorpay.com/v1",
      timeout: 30000 as Duration,
    }),
  ],
  controllers: [PayoutAccountsController],
  providers: [
    PayoutAccountsService,
    PayoutProviderService,
    InitiatePayoutOnboardingUseCase,
    CompletePayoutOnboardingUseCase,
    ExecutePayoutUseCase,
    ReconcilePayoutsUseCase,
    ListPayoutLinksUseCase,
    EncryptionService,
  ],
  exports: [
    PayoutAccountsService,
    InitiatePayoutOnboardingUseCase,
    CompletePayoutOnboardingUseCase,
    ExecutePayoutUseCase,
    ReconcilePayoutsUseCase,
    ListPayoutLinksUseCase,
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
