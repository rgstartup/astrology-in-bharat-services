import { Injectable } from '@nestjs/common';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class GetWalletTransactionsUseCase {
  constructor(private readonly walletFacade: WalletFacade) {}

  async execute(
    expertProfileId: string,
    limit: number,
    offset: number,
    type: string,
  ) {
    return this.walletFacade.getTransactions(
      expertProfileId,
      'expert_id',
      limit?.toString(),
      offset?.toString(),
      type,
    );
  }
}
