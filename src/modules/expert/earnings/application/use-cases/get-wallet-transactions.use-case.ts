import { Injectable } from '@nestjs/common';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

import { GetExpertTransactionsDto } from '../../api/dto/get-expert-transactions.dto';

@Injectable()
export class GetWalletTransactionsUseCase {
  constructor(private readonly walletFacade: WalletFacade) {}

  async execute(
    expertProfileId: string,
    dto: GetExpertTransactionsDto,
  ) {
    const { limit = 10, page = 1, offset, type = 'all' } = dto;
    const parsedOffset = offset !== undefined ? offset : (page - 1) * limit;

    return this.walletFacade.getTransactions(
      expertProfileId,
      'expert_id',
      limit.toString(),
      parsedOffset.toString(),
      type,
    );
  }
}
