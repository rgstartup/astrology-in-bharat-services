import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/persistence/entities/order.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/persistence/entities/profile-client.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class MarkOrderAsPaidUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private walletFacade: WalletFacade,
    private dataSource: DataSource,
  ) { }

  async execute(razorpayOrderId: string, externalQueryRunner?: QueryRunner) {
    const qr = externalQueryRunner || this.dataSource.createQueryRunner();
    
    if (!externalQueryRunner) {
      await qr.connect();
      await qr.startTransaction();
    }

    try {
      const order = await qr.manager.findOne(Order, {
        where: { razorpay_order_id: razorpayOrderId },
        relations: ['items', 'items.product'],
      });

      if (!order || order.status === OrderStatus.PAID) {
        if (!externalQueryRunner) await qr.rollbackTransaction();
        return;
      }

      // 1. Mark Order as Paid
      order.status = OrderStatus.PAID;
      await qr.manager.save(order);

      // 2. Track Client Spending
      try {
        let clientProfile = await qr.manager.findOne(ProfileClient, {
          where: { user_id: order.user_id },
          select: ['id']
        });
        if (!clientProfile) {
          clientProfile = qr.manager.create(ProfileClient, { user_id: order.user_id });
          clientProfile = await qr.manager.save(clientProfile);
        }

        await qr.manager.createQueryBuilder()
          .update(ProfileClient)
          .set({ total_spending: () => `COALESCE(total_spending, 0) + ${Number(order.total_amount)}` })
          .where('id = :id', { id: clientProfile.id })
          .execute();
      } catch (e) {
        console.error('[MARK_AS_PAID_TRACKING] Client spending error:', e);
      }

      if (!externalQueryRunner) {
        await qr.commitTransaction();
      }
    } catch (error) {
      if (!externalQueryRunner && qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      throw error;
    } finally {
      if (!externalQueryRunner) {
        await qr.release();
      }
    }
  }
}
