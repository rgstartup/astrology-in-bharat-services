import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { payoutPlatformAccounts } from '@/core/drizzledb/schema';
import { eq } from 'drizzle-orm';
import { InitiateBankLinkUseCase } from './use-cases/initiate-bank-link.usecase';
import { CompleteBankLinkUseCase } from './use-cases/complete-bank-link.usecase';
import { ListBankLinksUseCase } from './use-cases/list-bank-links.usecase';
import { RefreshBankLinkStatusUseCase } from './use-cases/refresh-bank-link-status.usecase';
import { SetPrimaryBankLinkUseCase } from './use-cases/set-primary-bank-link.usecase';
import { DeleteBankLinkUseCase } from './use-cases/delete-bank-link.usecase';
import { ValidatePennyDropUseCase } from './use-cases/validate-penny-drop.usecase';

@Injectable()
export class BankLinkService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly initiateBankLinkUseCase: InitiateBankLinkUseCase,
    private readonly completeBankLinkUseCase: CompleteBankLinkUseCase,
    private readonly listBankLinksUseCase: ListBankLinksUseCase,
    private readonly refreshBankLinkStatusUseCase: RefreshBankLinkStatusUseCase,
    private readonly setPrimaryBankLinkUseCase: SetPrimaryBankLinkUseCase,
    private readonly deleteBankLinkUseCase: DeleteBankLinkUseCase,
    private readonly validatePennyDropUseCase: ValidatePennyDropUseCase,
  ) {}

  async initiate(input: any) {
    return this.initiateBankLinkUseCase.execute(input);
  }

  async complete(input: any) {
    return this.completeBankLinkUseCase.execute(input);
  }

  async validatePennyDrop(expert: any, validationId: string, amount: number) {
    return this.validatePennyDropUseCase.execute({
      expert,
      validationId,
      amount,
    });
  }

  async getRedirectUriByState(state: string): Promise<string | null> {
    // RazorpayX uses form-based flow, no OAuth callback/state storage needed.
    // Kept for API compatibility; returns null (falls back to EXPERT_APP_BASE_URL).
    return null;
  }

  async list(expert: any) {
    return this.listBankLinksUseCase.execute(expert);
  }

  async refreshStatus(expert: any) {
    return this.refreshBankLinkStatusUseCase.execute(expert);
  }

  async setPrimary(expert: any, partnerPayoutAccountId: number | undefined, payoutPlatformAccountId?: number) {
    return this.setPrimaryBankLinkUseCase.execute({
      expertId: Number(expert.sub),
      payoutPlatformAccountId,
    });
  }

  async delete(expert: any, payoutPlatformAccountId?: number) {
    return this.deleteBankLinkUseCase.execute({
      expert,
      payoutPlatformAccountId,
    });
  }
}
