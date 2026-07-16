import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { CalculateMerchantEarningsUseCase } from './calculate-merchant-earnings.usecase';

@Injectable()
export class GetMerchantFinanceStatsUseCase {
  constructor(
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepo: Repository<ProfileMerchant>,
    private readonly calculateEarnings: CalculateMerchantEarningsUseCase,
  ) {}

  async execute(userId: string) {
    console.log('[FINANCE_STATS] Executing for userId:', userId);
    try {
      // Resolve merchant profile ID from user ID
      const merchantProfile = await this.merchantRepo.findOne({
        where: { user_id: userId },
        select: ['id'],
      });
      const merchantId = merchantProfile?.id;
      if (!merchantId) {
        throw new Error('Merchant profile not found');
      }

      const [wallet, actual_earnings, withdrawalsStatus, earnings] =
        await Promise.all([
          this.walletFacade.getWallet(merchantId, 'merchant_id'),
          this.walletFacade.getTotalEarnings(merchantId, 'merchant_id'),
          this.walletFacade.getWithdrawalsStatus(merchantId, 'merchant_id'),
          this.calculateEarnings.execute(userId),
        ]);

      // Calculate next payout date (Next Monday at 10 AM)
      const next_payout_date = new Date();
      const daysUntilMonday = (1 + 7 - next_payout_date.getDay()) % 7 || 7;
      next_payout_date.setDate(next_payout_date.getDate() + daysUntilMonday);
      next_payout_date.setHours(10, 0, 0, 0);

      const result = {
        totalEarnings: earnings.netTotal,
        actualEarnings: Number(actual_earnings) || 0,
        availableBalance: Number(wallet?.balance) || 0,
        pendingPayout: Number(withdrawalsStatus?.pending_amount) || 0,
        processingAmount: Number(withdrawalsStatus?.processing_amount) || 0,
        totalPayouts: Number(withdrawalsStatus?.total_withdrawn) || 0,
        nextPayoutDate: next_payout_date.toISOString(),
      };

      console.log('[FINANCE_STATS] Final Result:', result);
      return result;
    } catch (error) {
      console.error('[FINANCE_STATS] Error in use case:', error);
      throw error;
    }
  }
}
