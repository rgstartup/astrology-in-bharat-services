import { Injectable } from '@nestjs/common';
import { WalletService } from '../../../../finance/wallet/wallet.service';

import { RequestExpertWithdrawalDto } from '../dto/request-expert-withdrawal.dto';

@Injectable()
export class RequestWithdrawalUseCase {
  constructor(private readonly walletService: WalletService) {}

  async execute(
    expertProfileId: number,
    dto: RequestExpertWithdrawalDto,
    idempotencyKey?: string,
    securityMetadata?: { ip?: string; ua?: string },
  ) {
    const { amount, bank_account_id } = dto;
    return this.walletService.requestWithdrawal(
      expertProfileId,
      'expert_id',
      amount,
      bank_account_id,
      idempotencyKey,
      securityMetadata,
    );
  }
}
