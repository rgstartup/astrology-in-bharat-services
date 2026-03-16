import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/persistence/entities/order.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/persistence/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/persistence/entities/transaction.entity';

@Injectable()
export class MarkOrderAsPaidUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private walletFacade: WalletFacade,
    private dataSource: DataSource,
  ) { }

  async execute(razorpayOrderId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { razorpay_order_id: razorpayOrderId },
        relations: ['items', 'items.product'],
      });

      if (!order || order.status === OrderStatus.PAID) {
        await queryRunner.rollbackTransaction();
        return;
      }

      // 1. Mark Order as Paid
      order.status = OrderStatus.PAID;
      await queryRunner.manager.save(order);

      // 2. Track Client Spending
      try {
        let clientProfile = await queryRunner.manager.findOne(ProfileClient, {
          where: { user: { id: order.user_id } },
          select: ['id']
        });
        if (!clientProfile) {
          clientProfile = queryRunner.manager.create(ProfileClient, { user: { id: order.user_id } as any, user_id: order.user_id });
          clientProfile = await queryRunner.manager.save(clientProfile);
          console.log(`[MARK_AS_PAID_TRACKING] Created shell profile for user ${order.user_id}`);
        }

        await queryRunner.manager.createQueryBuilder()
          .update(ProfileClient)
          .set({ total_spending: () => `COALESCE(total_spending, 0) + ${Number(order.total_amount)}` })
          .where('id = :id', { id: clientProfile.id })
          .execute();
        console.log(`[MARK_AS_PAID_TRACKING] Updated spending for client profile ${clientProfile.id} with amount ${order.total_amount}`);
      } catch (e) {
        console.error('[MARK_AS_PAID_TRACKING] Client spending error:', e);
      }

      // 3. Track Expert Earnings (Iterate over items)
      for (const item of order.items) {
        if (item.product && item.product.expert_id) {
          const itemTotal = Number(item.price) * (item.quantity || 1);
          try {
            const expertProfile = await queryRunner.manager.findOne(ProfileExpert, {
              where: { id: item.product.expert_id },
              select: ['user_id']
            });

            if (expertProfile?.user_id) {
              await this.walletFacade.credit(
                expertProfile.user_id,
                itemTotal,
                TransactionPurpose.PRODUCT_PURCHASE,
                `order_${order.id}_item_${item.id}`
              );
              console.log(`[MARK_AS_PAID_TRACKING] Credited expert user ${expertProfile.user_id} with amount ${itemTotal} for order ${order.id}`);
            }
          } catch (e) { console.error('[MARK_AS_PAID_TRACKING] Expert earning error:', e); }
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
