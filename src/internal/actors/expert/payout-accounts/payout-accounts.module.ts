import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EncryptionService } from "@/shared/services/encryption.service";
import { PayoutProviderModule } from "@/external/payout-onboarding/payout-provider.module";
import { PayoutAccountsController } from "./controllers/payout-accounts.controller";
import { PayoutAccountsService } from "./payout-accounts.service";
import { PayoutProviderService } from "./payout-provider.service";
import {
  InitiatePayoutOnboardingUseCase,
  CompletePayoutOnboardingUseCase,
  ExecutePayoutUseCase,
  ReconcilePayoutsUseCase,
} from "./use-cases";

@Module({
  imports: [ConfigModule, PayoutProviderModule],
  controllers: [PayoutAccountsController],
  providers: [
    PayoutAccountsService,
    PayoutProviderService,
    InitiatePayoutOnboardingUseCase,
    CompletePayoutOnboardingUseCase,
    ExecutePayoutUseCase,
    ReconcilePayoutsUseCase,
    EncryptionService,
  ],
  exports: [
    PayoutAccountsService,
    InitiatePayoutOnboardingUseCase,
    CompletePayoutOnboardingUseCase,
    ExecutePayoutUseCase,
    ReconcilePayoutsUseCase,
  ],
})
export class PayoutAccountsModule {}
