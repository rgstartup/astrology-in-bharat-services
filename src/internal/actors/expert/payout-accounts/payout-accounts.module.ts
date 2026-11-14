import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpClientModule } from "@nestjs/http-client";
import type { Duration } from "@nestjs/http-client";
import { EncryptionService } from "@/shared/services/encryption.service";
import { PayoutProviderModule } from "@/external/payout-onboarding/payout-provider.module";
import { PayoutAccountsController } from "./controllers/payout-accounts.controller";
import { PayoutAccountsService } from "./payout-accounts.service";
import { PayoutProviderService } from "./payout-provider.service";
import { RazorpayPayoutService } from "./gateways/razorpay-payout.service";
import {
  InitiatePayoutOnboardingUseCase,
  CompletePayoutOnboardingUseCase,
  ExecutePayoutUseCase,
  ReconcilePayoutsUseCase,
} from "./use-cases";

@Module({
  imports: [
    ConfigModule,
    PayoutProviderModule,
    HttpClientModule.register({
      baseUrl: "https://api.razorpay.com/v1",
      timeout: 30000 as Duration,
    }),
  ],
  controllers: [PayoutAccountsController],
  providers: [
    PayoutAccountsService,
    PayoutProviderService,
    RazorpayPayoutService,
    InitiatePayoutOnboardingUseCase,
    CompletePayoutOnboardingUseCase,
    ExecutePayoutUseCase,
    ReconcilePayoutsUseCase,
    EncryptionService,
  ],
  exports: [
    PayoutAccountsService,
    RazorpayPayoutService,
    InitiatePayoutOnboardingUseCase,
    CompletePayoutOnboardingUseCase,
    ExecutePayoutUseCase,
    ReconcilePayoutsUseCase,
  ],
})
export class PayoutAccountsModule {}
