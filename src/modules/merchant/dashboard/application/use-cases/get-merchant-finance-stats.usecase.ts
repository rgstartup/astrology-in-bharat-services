import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { OrderItem } from '@/modules/order/infrastructure/persistence/entities/order-item.entity';
import { OrderStatus } from '@/modules/order/infrastructure/persistence/entities/order.entity';

@Injectable()
export class GetMerchantFinanceStatsUseCase {
  constructor(
    private readonly walletFacade: WalletFacade,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
  ) {}

  async execute(userId: number) {
    console.log('[FINANCE_STATS] Executing for userId:', userId);
    try {
      const [wallet, actualEarnings, withdrawalsStatus, grossEarningsQuery] = await Promise.all([
        this.walletFacade.getWallet(userId),
        this.walletFacade.getTotalEarnings(userId),
        this.walletFacade.getWithdrawalsStatus(userId),
        this.orderItemRepo
          .createQueryBuilder('oi')
          .innerJoin('oi.order', 'o')
          .innerJoin('oi.product', 'p')
          .where('p.merchant_id = :userId', { userId })
          .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
          .select('SUM(oi.price * oi.quantity)', 'sum')
          .getRawOne()
      ]);

      const grossEarnings = Number(grossEarningsQuery?.sum) || 0;
      console.log('[FINANCE_STATS] Data retrieved:', { wallet, actualEarnings, withdrawalsStatus, grossEarnings });

      // Calculate next payout date (Next Monday at 10 AM)
      const nextPayoutDate = new Date();
      const daysUntilMonday = (1 + 7 - nextPayoutDate.getDay()) % 7 || 7;
      nextPayoutDate.setDate(nextPayoutDate.getDate() + daysUntilMonday);
      nextPayoutDate.setHours(10, 0, 0, 0);

      const result = {
        totalEarnings: grossEarnings, // Matching dashboard "Total Earnings"
        actualEarnings: Number(actualEarnings) || 0, // Money actually credited
        availableBalance: Number(wallet?.balance) || 0,
        pendingPayout: Number(withdrawalsStatus?.pendingWithdrawals) || 0,
        totalPayouts: Number(withdrawalsStatus?.totalWithdrawn) || 0,
        nextPayoutDate: nextPayoutDate.toISOString(),
      };
      
      console.log('[FINANCE_STATS] Final Result:', result);
      return result;
    } catch (error) {
      console.error('[FINANCE_STATS] Error in use case:', error);
      throw error;
    }
  }
}
