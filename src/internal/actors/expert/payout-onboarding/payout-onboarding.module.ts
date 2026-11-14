import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EncryptionService } from "@/shared/services/encryption.service";
import { PayoutProviderModule } from "@/external/payout-onboarding/payout-provider.module";
import {
  InitiatePayoutOnboardingUseCase,
  CompletePayoutOnboardingUseCase,
} from "./use-cases";

@Module({
  imports: [ConfigModule, PayoutProviderModule],
  providers: [
    InitiatePayoutOnboardingUseCase,
    CompletePayoutOnboardingUseCase,
    EncryptionService,
  ],
  exports: [InitiatePayoutOnboardingUseCase, CompletePayoutOnboardingUseCase],
})
export class PayoutOnboardingModule {}
