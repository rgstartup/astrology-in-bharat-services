import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/persistence/entities/order.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/persistence/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { Product } from '@/modules/product/infrastructure/persistence/entities/product.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/persistence/entities/notification.entity';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';

import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/persistence/entities/transaction.entity';

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private notificationFacade: NotificationFacade,
    private notificationGateway: NotificationGateway,
    private emailService: NodeMailerService,
    private walletFacade: WalletFacade,
    private dataSource: DataSource,
  ) { }

  async execute(id: number, status: OrderStatus, cancellationReason?: string) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const oldStatus = order.status;
    order.status = status;
    if (cancellationReason) {
      order.cancellation_reason = cancellationReason;
    }

    const updatedOrder = await this.orderRepo.save(order);

    // --- NEW: Tracking Logic for Manual Payment Updates ---
    if (status === OrderStatus.PAID && oldStatus !== OrderStatus.PAID) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const orderWithItems = await queryRunner.manager.findOne(Order, {
          where: { id },
          relations: ['items', 'items.product'],
        });

        if (orderWithItems) {
          // 1. Track Client Spending
          try {
            let clientProfile = await queryRunner.manager.findOne(ProfileClient, {
              where: { user: { id: order.user_id } },
              select: ['id']
            });
            if (!clientProfile) {
              clientProfile = queryRunner.manager.create(ProfileClient, { user: { id: order.user_id } as any, user_id: order.user_id });
              clientProfile = await queryRunner.manager.save(clientProfile);
              console.log(`[ORDER_STATUS_TRACKING] Created shell profile for user ${order.user_id}`);
            }

            await queryRunner.manager.createQueryBuilder()
              .update(ProfileClient)
              .set({ total_spending: () => `COALESCE(total_spending, 0) + ${Number(order.total_amount)}` })
              .where('id = :id', { id: clientProfile.id })
              .execute();
            console.log(`[ORDER_STATUS_TRACKING] Updated spending for client profile ${clientProfile.id} with amount ${order.total_amount}`);
          } catch (e) {
            console.error('[ORDER_STATUS_TRACKING] Client spending error:', e);
          }

          // 2. Track Expert Earnings
          for (const item of orderWithItems.items) {
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
                  console.log(`[ORDER_STATUS_TRACKING] Credited expert user ${expertProfile.user_id} with amount ${itemTotal} for order ${order.id}`);
                }
              } catch (e) { console.error('[ORDER_STATUS_TRACKING] Expert earning error:', e); }
            }
          }
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Failed to update tracking for manual payment status update:', error);
      } finally {
        await queryRunner.release();
      }
    }
    // ------------------------------------------------------

    // Create notification and emit socket event based on status
    let notificationType: NotificationType;
    let title: string;
    let message: string;

    switch (status) {
      case OrderStatus.PACKED:
        notificationType = NotificationType.ORDER_PACKED;
        title = 'Order Packed';
        message = `Your order #${id} has been packed and is ready for shipment`;
        break;
      case OrderStatus.SHIPPED:
        notificationType = NotificationType.ORDER_SHIPPED;
        title = 'Order Shipped';
        message = `Your order #${id} has been shipped`;
        break;
      case OrderStatus.DELIVERED:
        notificationType = NotificationType.ORDER_DELIVERED;
        title = 'Order Delivered';
        message = `Your order #${id} has been delivered`;
        break;
      case OrderStatus.CANCELLED:
        notificationType = NotificationType.ORDER_CANCELLED;
        title = 'Order Cancelled';
        message = cancellationReason
          ? `Your order #${id} has been cancelled. Reason: ${cancellationReason}`
          : `Your order #${id} has been cancelled`;
        break;
      default:
        return updatedOrder; // No notification for other statuses
    }

    // Save notification to DB via facade
    await this.notificationFacade.create(
      order.user_id,
      notificationType,
      title,
      message,
      { orderId: id, status, amount: order.total_amount },
    );

    // Emit real-time socket event to user
    this.notificationGateway.emitToUser(order.user_id, 'order_status_updated', {
      orderId: id,
      status,
      title,
      message,
      cancellationReason,
    });

    // Send status update email to user
    try {
      const user = await this.userRepo.findOne({ where: { id: order.user_id } });
      if (user?.email) {
        const emailHtml = `
          <h2>${title}</h2>
          <p>Dear ${user.name || 'Customer'},</p>
          <p>${message}</p>
          <p><strong>Order ID:</strong> #${id}</p>
          <p><strong>New Status:</strong> ${status}</p>
          ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
          <p>Thank you for your patience!</p>
        `;
        await this.emailService.sendEmail(
          user.email,
          `Order Update - ${title}`,
          emailHtml,
        );
      }
    } catch (emailError) {
      console.error('Failed to send status update email:', emailError);
    }

    return updatedOrder;
  }
}
