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
import { PayoutOnboardingFactory } from "@/external/payouts/onboarding/payout-onboarding.factory";
import { PAYOUT_ONBOARDING_SERVICE } from "@/external/payouts/onboarding/payout-onboarding.interface";
import { EncryptionService } from "@/shared/services/encryption.service";
import { ExpertAuthModule } from "../auth/auth.module";
import { PayoutsAccountsModule } from "@/internal/payouts/accounts/payouts-accounts.module";
import { RazorpayXModule } from "@/external/razorpayx/razorpayx.module";

@Module({
  imports: [
    ConfigModule,
    ExpertAuthModule,
    PayoutsAccountsModule,
    RazorpayXModule,
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
