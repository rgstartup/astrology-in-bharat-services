
import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/entities/order.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/entities/transaction.entity';

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private usersFacade: UsersFacade,
    private notificationFacade: NotificationFacade,
    private notificationGateway: NotificationGateway,
    private emailService: NodeMailerService,
    @Inject(forwardRef(() => WalletFacade))
    private walletFacade: WalletFacade,
    private dataSource: DataSource,
  ) { }

  async execute(id: string, status: OrderStatus, cancellationReason?: string, merchantId?: string) {
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
    
    // Prevent changing status if already DELIVERED or CANCELLED
    if (oldStatus === OrderStatus.DELIVERED || oldStatus === OrderStatus.CANCELLED) {
      throw new ForbiddenException(`Cannot update status. Order #${id} is already ${oldStatus.toUpperCase()}.`);
    }

    console.log(`[ORDER_STATUS_UPDATE] Start - ID: ${id}, NewStatus: ${status}, OldStatus: ${oldStatus}, MerchantId: ${merchantId}`);
    
    // --- ATOMIC TRANSACTION FOR ALL STATUS SIDE-EFFECTS ---
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update status and basic fields
      order.status = status;
      if (cancellationReason) {
        order.cancellation_reason = cancellationReason;
      }

      // Generate Delivery OTP when status becomes SHIPPED
      if (status === OrderStatus.SHIPPED && !order.delivery_otp) {
        order.delivery_otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[ORDER_OTP] Generated OTP ${order.delivery_otp} for order #${id}`);
      }

      const updatedOrder = await queryRunner.manager.save(Order, order);
      console.log(`[ORDER_STATUS_UPDATE] Status saved in transaction - ID: ${id}, Status: ${status}`);

      // 2. Logic for PAID status (Manual update)
      if (status === OrderStatus.PAID && oldStatus !== OrderStatus.PAID) {
        try {
          let clientProfile = await queryRunner.manager.findOne(ProfileClient, {
            where: { user: { id: order.client_id } },
            select: ['id']
          });
          if (!clientProfile) {
            clientProfile = queryRunner.manager.create(ProfileClient, { user: { id: order.client_id } as any, client_id: order.client_id });
            clientProfile = await queryRunner.manager.save(clientProfile);
          }

          await queryRunner.manager.createQueryBuilder()
            .update(ProfileClient)
            .set({ total_spending: () => `COALESCE(total_spending, 0) + ${Number(order.total_amount)}` })
            .where('id = :id', { id: clientProfile.id })
            .execute();
        } catch (e) {
          console.error('[ORDER_STATUS_TRACKING] Client spending error:', e);
        }
      }

      // 3. Logic for CANCELLED status (Stock restoration & Wallet refund)
      if (status === OrderStatus.CANCELLED) {
        // Refetch order with relations inside transaction to be 100% sure
        const orderInsideTx = await queryRunner.manager.findOne(Order, {
          where: { id },
          relations: ['items', 'items.product']
        });

        if (orderInsideTx) {
          // a. Restore Stock
          for (const item of orderInsideTx.items) {
            if (item.product) {
              const product = item.product;
              product.stock += item.quantity;
              await queryRunner.manager.save(Product, product);
              console.log(`[ORDER_CANCELLED_STOCK] Restored ${item.quantity} to stock of product ${product.id}`);
            }
          }

          // b. Wallet Logic: ONLY refund if order was PAID or PROCESSING/SHIPPED (implies payment received)
          const eligibleForRefund = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.PACKED, OrderStatus.DELIVERED].includes(oldStatus);
          
          if (eligibleForRefund) {
            const refundAmount = Number(orderInsideTx.total_amount);
            console.log(`[ORDER_CANCELLED_WALLET] Refund eligible. Amount: ${refundAmount}, Client: ${orderInsideTx.client_id}`);

            if (refundAmount > 0) {
              const merchantAmounts: Record<number, number> = {};
              for (const item of orderInsideTx.items) {
                const mId = item.product?.merchant_id;
                if (mId) {
                  const itemTotal = Number(item.price) * item.quantity;
                  merchantAmounts[mId] = (merchantAmounts[mId] || 0) + itemTotal;
                }
              }

              // Fallback if merchant amounts calculation failed
              if (Object.keys(merchantAmounts).length === 0) {
                let fallbackMerchant = merchantId;
                if (!fallbackMerchant && orderInsideTx.items.length > 0) {
                  fallbackMerchant = orderInsideTx.items[0].product?.merchant_id;
                }
                if (fallbackMerchant) merchantAmounts[fallbackMerchant] = refundAmount;
              }

              // Fetch settings for accurate refund calculation (Gross - Commissions)
              const refundPlatformFeeRate = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FROM_PUJA_SHOP');
              const refundGstRate = await this.walletFacade.getAdminCommissionFromSetting('GST_PERCENTAGE');

              // Debit Merchant(s) ONLY if the order was already settled (Delivered)
              if ((oldStatus as any) === OrderStatus.DELIVERED) {
                for (const [mId, grossAmount] of Object.entries(merchantAmounts)) {
                  const debitId = mId;
                  
                  // Calculate Net that was actually credited (to avoid over-debiting merchant)
                  const platformFee = Number((grossAmount * (refundPlatformFeeRate / 100)).toFixed(2));
                  const gstOnFee = Number((platformFee * (refundGstRate / 100)).toFixed(2));
                  // Note: Agent commissions are not reclaimed here for simplicity/safety, 
                  // but we subtract platform fee and GST to only debit what the merchant actually received.
                  const netToDebit = Number((grossAmount - platformFee - gstOnFee).toFixed(2));

                  console.log(`[ORDER_CANCELLED_WALLET] Debiting merchant ${debitId} for net amount ${netToDebit} (Gross was ${grossAmount}) because order was previously DELIVERED`);
                  
                  await this.walletFacade.debit(
                    debitId,
                    netToDebit,
                    TransactionPurpose.REFUND,
                    `order_cancel_debit_${orderInsideTx.id}`,
                    queryRunner,
                    true // allowNegative
                  );
                }
              }

              // Credit Client (Refund)
              await this.walletFacade.credit(
                orderInsideTx.client_id,
                refundAmount,
                TransactionPurpose.REFUND,
                `order_cancel_refund_${orderInsideTx.id}`,
                queryRunner
              );
              console.log(`[ORDER_CANCELLED_WALLET] Refund successful`);
            }
          } else {
            console.log(`[ORDER_CANCELLED_WALLET] Refund skipped: Order was in status ${oldStatus} (not paid)`);
          }
        }
      }

      await queryRunner.commitTransaction();
      console.log(`[ORDER_STATUS_UPDATE] Transaction committed successfully - ID: ${id}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`[ORDER_STATUS_UPDATE] Transaction failed, rolled back - ID: ${id}, Error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Order was refetched here to get the relations, but we don't need it for BooleanMessage
    // We only need it if we used it in the notifications, but we use `id` and `order.total_amount` which we already have.
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
                relations: ['items', 'items.product']
            });

            if (orderWithItems) {
                const gstRate = await this.walletFacade.getAdminCommissionFromSetting('GST_PERCENTAGE');
                const platformFeeRate = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FROM_PUJA_SHOP');
                const buyerAgentRateSetting = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FOR_BUYER_AGENT');

                for (const item of orderWithItems.items) {
                    const itemTotal = Number(item.price) * (item.quantity || 1);
                    const merchantId = item.product?.merchant_id;

                    if (merchantId) {
                        const merchantUser = await qr.manager.findOne(User, {
                            where: { id: merchantId }
                        });

                        const { ProfileMerchant } = await import('../../../../merchant/profile/infrastructure/entities/profile-merchant.entity');
                        const merchantProfile = await qr.manager.findOne(ProfileMerchant, {
                            where: { user: { id: merchantId } }
                        });

                        // 1. Seller's Agent Commission (Current Logic: 30-day window)
                        let agent_commission = 0;
                        let agent_id: string | undefined = undefined;

                        if (merchantUser?.referred_by_id && merchantProfile) {
                            agent_id = merchantUser.referred_by_id;
                            const effectiveAgentRate = merchantProfile.agent_commission_rate ?? platformFeeRate;
                            agent_commission = Number((itemTotal * (effectiveAgentRate / 100)).toFixed(2));
                        }

                        // 2. Buyer's Agent Commission (New Logic: If buyer has an agent assigned)
                        let buyer_agent_commission = 0;
                        let buyer_agent_id: string | undefined = undefined;
                        
                        const buyerUser = await qr.manager.findOne(User, {
                            where: { id: orderWithItems.client_id },
                            select: ['id', 'referred_by_id']
                        });

                        if (buyerUser?.referred_by_id) {
                            buyer_agent_id = buyerUser.referred_by_id;
                            buyer_agent_commission = Number((itemTotal * (buyerAgentRateSetting / 100)).toFixed(2));
                        }

                        // 3. Platform Fee & GST
                        const platformFee = Number((itemTotal * (platformFeeRate / 100)).toFixed(2));
                        const gst = Number((platformFee * (gstRate / 100)).toFixed(2));

                        // 4. Final Merchant Net Share
                        const merchantNet = Number((itemTotal - platformFee - gst - agent_commission - buyer_agent_commission).toFixed(2));

                        // --- EXECUTE CREDITS ---
                        
                        // A. Credit Merchant
                        await this.walletFacade.credit(
                            merchantId,
                            merchantNet,
                            TransactionPurpose.CONSULTATION, // Reusing for earnings
                            `order_item_${item.id}`,
                            qr
                        );

                        // B. Credit Seller's Agent
                        if (agent_commission > 0 && agent_id) {
                            await this.walletFacade.credit(
                                agent_id,
                                agent_commission,
                                'agent_commission' as any,
                                `order_item_${item.id}`,
                                qr
                            );
                        }

                        // C. Credit Buyer's Agent
                        if (buyer_agent_commission > 0 && buyer_agent_id) {
                            await this.walletFacade.credit(
                                buyer_agent_id,
                                buyer_agent_commission,
                                'agent_commission' as any,
                                `order_item_buyer_ref_${item.id}`,
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
        message = `your order is cancelled from merchant side and the amount of order is added to you astrology in bharat wallet`;
        emailSubject = `Order Cancelled - #${id}`;
        break;
      case OrderStatus.PROCESSING:
        notificationType = NotificationType.ORDER_PLACED; // Reusing placed/processing
        title = 'Order Processing';
        message = `Your order #${id} is now being processed by the merchant.`;
        emailSubject = `Order Update - Processing #${id}`;
        break;
      default:
        return new BooleanMessage();
    }

    // Save notification to DB via facade
    await this.notificationFacade.create(
      order.client_id,
      notificationType,
      title,
      message,
      { orderId: id, status, amount: order.total_amount },
    );

    // Emit real-time socket event to user
    this.notificationGateway.emitToUser(order.client_id, 'order_status_updated', {
      orderId: id,
      status,
      title,
      message,
      cancellationReason,
    });

    // Send status update email to user
    try {
      const user = await this.usersFacade.findById(order.client_id);
      if (user && user.email) {
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
              <p style="font-size: 16px;">Dear ${user?.name || 'Customer'},</p>
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

    return new BooleanMessage();
  }
}
