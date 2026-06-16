import { Injectable } from '@nestjs/common';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

@Injectable()
export class RequestWithdrawalUseCase {
  constructor(private readonly walletFacade: WalletFacade) {}

  async execute(
    expertProfileId: string,
    amount: number,
    bank_account_id: string | number,
    idempotencyKey?: string,
    securityMetadata?: { ip?: string; ua?: string },
  ) {
    return this.walletFacade.requestWithdrawal(
      expertProfileId,
      'expert_id',
      amount,
      bank_account_id,
      idempotencyKey,
      securityMetadata,
    );
  }
}
