import { Injectable } from '@nestjs/common';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

import { RequestExpertWithdrawalDto } from '../../api/dto/request-expert-withdrawal.dto';

@Injectable()
export class RequestWithdrawalUseCase {
  constructor(private readonly walletFacade: WalletFacade) {}

  async execute(
    expertProfileId: string,
    dto: RequestExpertWithdrawalDto,
    idempotencyKey?: string,
    securityMetadata?: { ip?: string; ua?: string },
  ) {
    const { amount, bank_account_id } = dto;
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
