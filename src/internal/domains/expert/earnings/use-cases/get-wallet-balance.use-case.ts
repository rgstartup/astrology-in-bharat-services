import { Injectable } from '@nestjs/common';
import { WalletService } from '../../../../finance/wallet/wallet.service';

@Injectable()
export class GetWalletBalanceUseCase {
  constructor(private readonly walletService: WalletService) {}

  async execute(expertProfileId: number) {
    const balance = await this.walletService.getBalance(
      expertProfileId,
      'expert_id',
    );
    const stats = await this.walletService.getWithdrawalsStatus(
      expertProfileId,
      'expert_id',
    );
    const total_earnings = await this.walletService.getTotalEarnings(
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
