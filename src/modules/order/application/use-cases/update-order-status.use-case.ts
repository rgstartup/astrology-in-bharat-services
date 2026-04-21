import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  async execute(id: number, status: OrderStatus, cancellationReason?: string, merchantId?: number) {
    const order = await this.orderRepo.findOne({ 
      where: { id },
      relations: ['items', 'items.product']
    });
    if (!order) throw new NotFoundException('Order not found');

    // Ownership check for merchants
    if (merchantId) {
      const belongsToMerchant = order.items.some(item => item.product?.merchant_id === merchantId);
      if (!belongsToMerchant) {
        throw new ForbiddenException('You do not have permission to update this order');
      }
    }

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

        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Failed to update tracking for manual payment status update:', error);
      } finally {
        await queryRunner.release();
      }
    }

    // --- NEW: Stock Restoration Logic for Cancelled Orders ---
    if (status === OrderStatus.CANCELLED && oldStatus !== OrderStatus.CANCELLED) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const orderWithItems = await queryRunner.manager.findOne(Order, {
          where: { id },
          relations: ['items', 'items.product'],
        });

        if (orderWithItems) {
          for (const item of orderWithItems.items) {
            if (item.product) {
              const product = item.product;
              product.stock += item.quantity;
              await queryRunner.manager.save(Product, product);
              console.log(`[ORDER_CANCELLED_STOCK] Restored ${item.quantity} to stock of product ${product.id}`);
            }
          }
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Failed to restore stock for cancelled order:', error);
      } finally {
        await queryRunner.release();
      }
    }
    // ---------------------------------------------------------
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
        message = `Your order #${id} has been shipped. Use OTP ${order.delivery_otp} for delivery verification.`;
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
        let otpMessage = '';
        if (status === OrderStatus.SHIPPED && order.delivery_otp) {
          otpMessage = `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 5px solid #007bff;">
              <p style="margin: 0; color: #333;"><strong>Delivery Verification OTP:</strong></p>
              <h1 style="margin: 5px 0; color: #007bff; letter-spacing: 5px;">${order.delivery_otp}</h1>
              <p style="margin: 0; font-size: 0.9em; color: #666;">Please share this OTP with the delivery partner only at the time of delivery.</p>
            </div>
          `;
        }

        const emailHtml = `
          <h2>${title}</h2>
          <p>Dear ${user.name || 'Customer'},</p>
          <p>${message}</p>
          ${otpMessage}
          <p><strong>Order ID:</strong> #${id}</p>
          <p><strong>New Status:</strong> ${status}</p>
          ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
          <p>Thank you for choosing Astrology in Bharat!</p>
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
