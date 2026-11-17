import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BankLinkService } from "./bank-link.service";
import {
  InitiateBankLinkUseCase,
  CompleteBankLinkUseCase,
  ListBankLinksUseCase,
  RefreshBankLinkStatusUseCase,
  SetPrimaryBankLinkUseCase,
  DeleteBankLinkUseCase,
  ValidatePennyDropUseCase,
} from "./use-cases";
import { BankLinkController } from "./controllers/bank-link.controller";
import { PayoutOnboardingFactory } from "@/external/payout-onboarding/payout-onboarding.factory";
import { PAYOUT_ONBOARDING_SERVICE } from "@/external/payout-onboarding/payout-onboarding.interface";
import { EncryptionService } from "@/shared/services/encryption.service";
import { ExpertAuthModule } from "../auth/auth.module";
import { PayoutAccountsModule } from "@/internal/actors/expert/payout-accounts/payout-accounts.module";

@Module({
  imports: [
    ConfigModule,
    ExpertAuthModule,
    PayoutAccountsModule,
  ],
  controllers: [BankLinkController],
  providers: [
    BankLinkService,
    InitiateBankLinkUseCase,
    CompleteBankLinkUseCase,
    ListBankLinksUseCase,
    RefreshBankLinkStatusUseCase,
    SetPrimaryBankLinkUseCase,
    DeleteBankLinkUseCase,
    ValidatePennyDropUseCase,
    PayoutOnboardingFactory,
    EncryptionService,
  ],
  exports: [BankLinkService],
})
export class BankLinkModule {}
