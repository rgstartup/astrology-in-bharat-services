import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/entities/order.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { CouponFacade } from '@/modules/commerce/coupon/application/coupon.facade';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import {
  NotificationType,
  ProfileType,
} from '@/modules/notification/infrastructure/entities/notification.entity';

@Injectable()
export class MarkOrderAsPaidUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @Inject(forwardRef(() => WalletFacade))
    private walletFacade: WalletFacade,
    @Inject(forwardRef(() => CouponFacade))
    private couponFacade: CouponFacade,
    private notificationFacade: NotificationFacade,
    private dataSource: DataSource,
  ) {}

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

      // 1.5 Mark Coupon as used if applied
      if (order.coupon_code) {
        try {
          await this.couponFacade.markCouponAsUsed(
            order.client_id,
            order.coupon_code,
            qr.manager,
          );
        } catch (e) {
          console.error('[MARK_AS_PAID] Coupon marking error:', e);
          // Don't fail the whole transaction if coupon marking fails, but it's better to log it.
        }
      }

      // 2. Track Client Spending & Send Notification
      try {
        const clientProfile = await qr.manager.findOne(ProfileClient, {
          where: { id: order.client_id },
          select: ['id', 'user_id'],
        });
        if (!clientProfile) {
          // If the profile does not exist, we shouldn't attempt to track it since it's an FK dependency
          console.error(
            '[MARK_AS_PAID_TRACKING] Client profile not found for ID:',
            order.client_id,
          );
          return;
        }

        await qr.manager
          .createQueryBuilder()
          .update(ProfileClient)
          .set({
            total_spending: () =>
              `COALESCE(total_spending, 0) + ${Number(order.total_amount)}`,
          })
          .where('id = :id', { id: clientProfile.id })
          .execute();

        // Send Order Placed Notification
        if (clientProfile.id) {
          try {
            await this.notificationFacade.create(
              clientProfile.id,
              RoleEnum.CLIENT,
              NotificationType.ORDER_PLACED,
              'Order Placed Successfully',
              `Your order #${order.id.split('-')[0].toUpperCase()} for ₹${Number(order.total_amount).toLocaleString('en-IN')} has been confirmed.`,
              { orderId: order.id }
            );
          } catch (notifErr) {
            console.error('[MARK_AS_PAID] Notification error:', notifErr);
          }
        }

        // Send Notification to Merchants
        if (order.items && order.items.length > 0) {
          const merchantIds = [...new Set(order.items.map(item => item.product?.merchant_id).filter(Boolean))];
          for (const mId of merchantIds) {
            try {
              await this.notificationFacade.create(
                mId as string,
                RoleEnum.MERCHANT,
                NotificationType.ORDER_PLACED,
                'New Order Received!',
                `You have received a new order (#${order.id.split('-')[0].toUpperCase()}). Please check your dashboard for details.`,
                { orderId: order.id }
              );
            } catch (mErr) {
              console.error('[MARK_AS_PAID] Merchant notification error:', mErr);
            }
          }
        }
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
