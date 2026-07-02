import { Injectable } from '@nestjs/common';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class GetWalletBalanceUseCase {
  constructor(private readonly walletFacade: WalletFacade) {}

  async execute(expertProfileId: string) {
    const balance = await this.walletFacade.getBalance(
      expertProfileId,
      'expert_id',
    );
    const stats = await this.walletFacade.getWithdrawalsStatus(
      expertProfileId,
      'expert_id',
    );
    const total_earnings = await this.walletFacade.getTotalEarnings(
      expertProfileId,
      'expert_id',
    );

    return {
      available_balance: balance,
      total_earnings: total_earnings,
      ...stats,
    };
  }
}
