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

    // --- NEW: Generate Delivery OTP when status becomes SHIPPED ---
    if (status === OrderStatus.SHIPPED && !order.delivery_otp) {
        order.delivery_otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[ORDER_OTP] Generated OTP ${order.delivery_otp} for order #${id}`);
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
    let emailSubject: string;

    switch (status) {
      case OrderStatus.PACKED:
        notificationType = NotificationType.ORDER_PACKED;
        title = 'Order Packed';
        message = `Your order #${id} has been packed and is ready for shipment.`;
        emailSubject = `Order Packed - #${id}`;
        break;
      case OrderStatus.SHIPPED:
        notificationType = NotificationType.ORDER_SHIPPED;
        title = 'Order Shipped';
        message = `Your order #${id} has been shipped. Use OTP ${order.delivery_otp} for delivery verification.`;
        emailSubject = `Order Shipped - #${id}`;
        break;
      case OrderStatus.DELIVERED:
        notificationType = NotificationType.ORDER_DELIVERED;
        title = 'Order Delivered';
        message = `Good news! Your order #${id} has been successfully delivered.`;
        emailSubject = `Order Delivered - #${id}`;

        // 💰 FINANCIAL SETTLEMENT FOR MERCHANT AND AGENT
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();
        try {
            const orderWithItems = await qr.manager.findOne(Order, {
                where: { id },
                relations: ['items', 'items.product', 'items.product.merchant']
            });

            if (orderWithItems) {
                const gstRate = await this.walletFacade.getAdminCommissionFromSetting('GST_PERCENTAGE');
                const platformFeeRate = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FROM_CLIENT');
                const agentFeeRate = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FROM_PUJA_SHOP');

                for (const item of orderWithItems.items) {
                    const itemTotal = Number(item.price) * (item.quantity || 1);
                    const merchantId = item.product?.merchant_id;

                    if (merchantId) {
                        const merchantUser = await qr.manager.findOne(User, {
                            where: { id: merchantId },
                            relations: ['profile_merchant']
                        });

                        const merchantProfile = merchantUser?.profile_merchant;

                        let agent_commission = 0;
                        let agent_id: number | undefined = undefined;

                        const now = new Date();
                        // 30-Day Agent Commission Logic
                        if (merchantUser?.referred_by_id && merchantProfile?.created_at) {
                            const diffDays = Math.ceil(Math.abs(now.getTime() - merchantProfile.created_at.getTime()) / (1000 * 60 * 60 * 24));
                            if (diffDays <= 30) {
                                agent_id = merchantUser.referred_by_id;
                                const effectiveAgentRate = merchantProfile.agent_commission_rate ?? agentFeeRate;
                                agent_commission = Number((itemTotal * (effectiveAgentRate / 100)).toFixed(2));
                            }
                        }

                        const platformFee = Number((itemTotal * (platformFeeRate / 100)).toFixed(2));
                        const gst = Number((platformFee * (gstRate / 100)).toFixed(2));
                        const merchantNet = Number((itemTotal - platformFee - gst - agent_commission).toFixed(2));

                        // 1. Credit Merchant
                        await this.walletFacade.credit(
                            merchantId,
                            merchantNet,
                            TransactionPurpose.CONSULTATION, // Reusing for earnings
                            `order_item_${item.id}`,
                            qr
                        );

                        // 2. Credit Agent
                        if (agent_commission > 0 && agent_id) {
                            await this.walletFacade.credit(
                                agent_id,
                                agent_commission,
                                'agent_commission' as any,
                                `order_item_${item.id}`,
                                qr
                            );
                        }
                    }
                }
            }
            await qr.commitTransaction();
        } catch (err) {
            await qr.rollbackTransaction();
            console.error('[OrderSettlement] Failed to settle order funds:', err);
        } finally {
            await qr.release();
        }
        break;
      case OrderStatus.CANCELLED:
        notificationType = NotificationType.ORDER_CANCELLED;
        title = 'Order Cancelled';
        message = cancellationReason
          ? `Apologies, your order #${id} has been cancelled. Reason: ${cancellationReason}`
          : `Apologies, your order #${id} has been cancelled by the merchant.`;
        emailSubject = `Order Cancelled - #${id}`;
        break;
      case OrderStatus.PROCESSING:
        notificationType = NotificationType.ORDER_PLACED; // Reusing placed/processing
        title = 'Order Processing';
        message = `Your order #${id} is now being processed by the merchant.`;
        emailSubject = `Order Update - Processing #${id}`;
        break;
      default:
        return updatedOrder;
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
        let otpSection = '';
        if (status === OrderStatus.SHIPPED && order.delivery_otp) {
          otpSection = `
            <div style="background-color: #f0f7ff; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #cce3ff; text-align: center;">
              <p style="margin: 0; color: #0056b3; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Delivery Verification OTP</p>
              <h1 style="margin: 10px 0; color: #007bff; letter-spacing: 10px; font-size: 32px;">${order.delivery_otp}</h1>
              <p style="margin: 0; font-size: 12px; color: #666;">Please share this code with our delivery partner at your doorstep.</p>
            </div>
          `;
        }

        const isCancelled = status === OrderStatus.CANCELLED;
        
        const emailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            <div style="background-color: ${isCancelled ? '#fff5f5' : '#fffcf9'}; padding: 40px; border-radius: 20px; border: 1px solid ${isCancelled ? '#ffe3e3' : '#fff0e0'};">
              <h1 style="color: ${isCancelled ? '#e03131' : '#fd6410'}; margin-top: 0; font-size: 24px;">${title}</h1>
              <p style="font-size: 16px;">Dear ${user.name || 'Customer'},</p>
              <p style="font-size: 15px; color: #555;">${message}</p>
              
              ${otpSection}

              <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; margin-top: 25px; border: 1px solid #eee;">
                <p style="margin: 0; font-size: 13px; color: #999; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Order Details</p>
                <div style="margin-top: 10px; display: flex; justify-content: space-between;">
                   <p style="margin: 0; font-weight: bold;">Order ID: <span style="color: #fd6410;">#${id}</span></p>
                   <p style="margin: 0; font-weight: bold;">Status: <span style="text-transform: capitalize;">${status}</span></p>
                </div>
                ${cancellationReason ? `<p style="margin-top: 15px; font-size: 14px; padding: 10px; background-color: #f8f9fa; border-radius: 8px; color: #c92a2a;"><strong>Reason for Cancellation:</strong> ${cancellationReason}</p>` : ''}
              </div>

              <p style="margin-top: 30px; font-size: 14px; color: #888;">If you have any questions, please reply to this email or visit our support center.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
              <p style="font-size: 12px; color: #aaa; text-align: center;">© 2026 Astrology in Bharat. All rights reserved.</p>
            </div>
          </div>
        `;
        
        await this.emailService.sendEmail(
          user.email,
          emailSubject,
          emailHtml,
        );
      }
    } catch (emailError) {
      console.error('Failed to send status update email:', emailError);
    }

    return updatedOrder;
  }
}
