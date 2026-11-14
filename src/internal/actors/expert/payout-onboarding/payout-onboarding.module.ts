import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EncryptionService } from "@/shared/services/encryption.service";
import { PayoutProviderModule } from "@/external/payout-onboarding/payout-provider.module";
import { PayoutOnboardingController } from "./controllers/payout-onboarding.controller";
import {
  InitiatePayoutOnboardingUseCase,
  CompletePayoutOnboardingUseCase,
  ExecutePayoutUseCase,
} from "./use-cases";

@Module({
  imports: [ConfigModule, PayoutProviderModule],
  controllers: [PayoutOnboardingController],
  providers: [
    InitiatePayoutOnboardingUseCase,
    CompletePayoutOnboardingUseCase,
    ExecutePayoutUseCase,
    EncryptionService,
  ],
  exports: [
    InitiatePayoutOnboardingUseCase,
    CompletePayoutOnboardingUseCase,
    ExecutePayoutUseCase,
  ],
})
export class PayoutOnboardingModule {}
