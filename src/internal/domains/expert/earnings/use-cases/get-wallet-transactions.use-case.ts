import { Injectable } from '@nestjs/common';
import { WalletService } from '../../../../finance/wallet/wallet.service';

import { GetExpertTransactionsDto } from '../dto/get-expert-transactions.dto';

@Injectable()
export class GetWalletTransactionsUseCase {
  constructor(private readonly walletService: WalletService) {}

  async execute(expertProfileId: number, dto: GetExpertTransactionsDto) {
    const { limit = 10, page = 1, offset, type = 'all' } = dto;
    const parsedOffset = offset !== undefined ? offset : (page - 1) * limit;

    return this.walletService.getTransactions(
      expertProfileId,
      'expert_id',
      limit.toString(),
      parsedOffset.toString(),
      type,
    );
  }
}
