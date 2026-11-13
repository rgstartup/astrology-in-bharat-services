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
} from "./use-cases";
import { BankLinkController } from "./controllers/bank-link.controller";
import { PayoutOnboardingFactory } from "@/external/payout-onboarding/payout-onboarding.factory";
import { PAYOUT_ONBOARDING_SERVICE } from "@/external/payout-onboarding/payout-onboarding.interface";
import { EncryptionService } from "@/shared/services/encryption.service";
import { ExpertAuthModule } from "../auth/auth.module";
import { RazorpayXOnboardingModule } from "@/external/payout-onboarding/providers";
import { WalletModule } from "@/internal/finance/wallet/wallet.module";

@Module({
  imports: [ConfigModule, ExpertAuthModule, RazorpayXOnboardingModule, WalletModule],
  controllers: [BankLinkController],
  providers: [
    BankLinkService,
    InitiateBankLinkUseCase,
    CompleteBankLinkUseCase,
    ListBankLinksUseCase,
    RefreshBankLinkStatusUseCase,
    SetPrimaryBankLinkUseCase,
    DeleteBankLinkUseCase,
    PayoutOnboardingFactory,
    {
      provide: PAYOUT_ONBOARDING_SERVICE,
      useFactory: (factory: PayoutOnboardingFactory) => factory.resolve(),
      inject: [PayoutOnboardingFactory],
    },
    EncryptionService,
  ],
  exports: [BankLinkService],
})
export class BankLinkModule {}
