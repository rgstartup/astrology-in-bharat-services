import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/entities/order.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

import {
  WalletFacade,
  CommissionEventType,
  CommissionType,
  CommissionAppliesRole,
} from '@/modules/finance/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';
import { SplitReferenceType } from '@/modules/finance/commissions/infrastructure/entities/commission-split.entity';
import { IUser } from '@/common/types/access-token.payload';

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
  ) {}

  async execute(
    id: string,
    status: OrderStatus,
    cancellationReason?: string,
    merchantId?: string,
    user?: IUser,
  ) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['items', 'items.product', 'client', 'client.user'],
    });
    if (!order) throw new NotFoundException('Order not found');

    // Ownership check for merchants
    if (merchantId) {
      const belongsToMerchant = order.items.some(
        (item) => item.product?.merchant_id === merchantId,
      );
      if (!belongsToMerchant) {
        throw new ForbiddenException(
          'You do not have permission to update this order',
        );
      }
    }

    console.log(
      `[ORDER_STATUS_UPDATE] Start - ID: ${id}, NewStatus: ${status}, MerchantId: ${merchantId}`,
    );

    // Filter items to process
    const targetItems = merchantId
      ? order.items.filter((item) => item.product?.merchant_id === merchantId)
      : order.items;

    if (targetItems.length === 0) {
      throw new ForbiddenException(
        'No items found for this merchant in this order.',
      );
    }

    // Prevent changing if all target items are already DELIVERED or CANCELLED
    const allInvalid = targetItems.every(
      (item) =>
        item.status === OrderStatus.DELIVERED ||
        item.status === OrderStatus.CANCELLED,
    );
    if (allInvalid) {
      throw new ForbiddenException(
        `Cannot update status. The requested items are already DELIVERED or CANCELLED.`,
      );
    }

    // --- ATOMIC TRANSACTION FOR ALL STATUS SIDE-EFFECTS ---
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let deliveryOtpGenerated: string | null = null;

    try {
      // 1. Update status and basic fields ON ORDER ITEMS
      if (status === OrderStatus.SHIPPED) {
        deliveryOtpGenerated = Math.floor(
          100000 + Math.random() * 900000,
        ).toString();
      }

      for (const item of targetItems) {
        if (
          item.status !== OrderStatus.DELIVERED &&
          item.status !== OrderStatus.CANCELLED
        ) {
          item.status = status;
          if (cancellationReason) {
            item.cancellation_reason = cancellationReason;
          }
          if (deliveryOtpGenerated) {
            item.delivery_otp = deliveryOtpGenerated;
          }
          await queryRunner.manager.save(item);
        }
      }

      // Also append Audit Log to Master Order for tracking
      const updatedBy: string = user?.profile || merchantId || 'system';
      const role = user?.roles?.[0] || (merchantId ? 'merchant' : 'system');

      const newHistoryEntry = {
        status: status,
        updated_by: updatedBy,
        role: role,
        merchant_id: merchantId,
        updated_at: new Date().toISOString(),
      };

      order.status_history = Array.isArray(order.status_history)
        ? [...order.status_history, newHistoryEntry]
        : [newHistoryEntry];

      const _updatedOrder = await queryRunner.manager.save(Order, order);
      console.log(
        `[ORDER_STATUS_UPDATE] Item statuses saved in transaction - ID: ${id}, Status: ${status}`,
      );

      // 2. Logic for PAID status (Manual update)
      // Note: Usually triggered at master order level, but if merchant updates to PAID (rare), we can still track.
      if (status === OrderStatus.PAID) {
        try {
          const clientProfile = await queryRunner.manager.findOne(
            ProfileClient,
            {
              where: { id: order.client_id },
              select: ['id'],
            },
          );
          if (clientProfile) {
            const targetItemsTotal = targetItems.reduce(
              (sum, item) => sum + Number(item.price) * item.quantity,
              0,
            );
            await queryRunner.manager
              .createQueryBuilder()
              .update(ProfileClient)
              .set({
                total_spending: () =>
                  `COALESCE(total_spending, 0) + ${targetItemsTotal}`,
              })
              .where('id = :id', { id: clientProfile.id })
              .execute();
          }
        } catch (e) {
          console.error('[ORDER_STATUS_TRACKING] Client spending error:', e);
        }
      }

      // 3. Logic for CANCELLED status (Stock restoration & Wallet refund)
      if (status === OrderStatus.CANCELLED) {
        // Refetch order with relations inside transaction to be 100% sure
        const orderInsideTx = await queryRunner.manager.findOne(Order, {
          where: { id },
          relations: ['items', 'items.product'],
        });

        if (orderInsideTx) {
          const txTargetItems = merchantId
            ? orderInsideTx.items.filter(
                (item) => item.product?.merchant_id === merchantId,
              )
            : orderInsideTx.items;

          // a. Restore Stock
          for (const item of txTargetItems) {
            if (item.product) {
              const product = item.product;
              product.stock += item.quantity;
              await queryRunner.manager.save(Product, product);
              console.log(
                `[ORDER_CANCELLED_STOCK] Restored ${item.quantity} to stock of product ${product.id}`,
              );
            }
          }

          // b. Wallet Logic: ONLY refund if order was PAID or PROCESSING/SHIPPED (implies payment received)
          // We can safely refund for target items as they were previously paid for.
          const refundAmount = txTargetItems.reduce(
            (sum, item) => sum + Number(item.price) * item.quantity,
            0,
          );
          console.log(
            `[ORDER_CANCELLED_WALLET] Refund eligible for target items. Amount: ${refundAmount}, Client: ${orderInsideTx.client_id}`,
          );

          if (refundAmount > 0) {
            const merchantAmounts: Record<string, number> = {};
            for (const item of txTargetItems) {
              const mId = item.product?.merchant_id;
              if (mId) {
                const itemTotal = Number(item.price) * item.quantity;
                merchantAmounts[mId] = (merchantAmounts[mId] || 0) + itemTotal;
              }
            }

            // Fallback if merchant amounts calculation failed
            if (Object.keys(merchantAmounts).length === 0) {
              let fallbackMerchant = merchantId;
              if (!fallbackMerchant && txTargetItems.length > 0) {
                fallbackMerchant = txTargetItems[0].product?.merchant_id;
              }
              if (fallbackMerchant)
                merchantAmounts[fallbackMerchant] = refundAmount;
            }

            // Fetch settings for accurate refund calculation (Gross - Commissions)
            const refundPlatformFeeRate =
              await this.walletFacade.getAdminCommissionFromSetting(
                'COMMISION_FROM_PUJA_SHOP',
              );
            const refundGstRate =
              await this.walletFacade.getAdminCommissionFromSetting(
                'GST_PERCENTAGE',
              );

            // Debit Merchant(s) ONLY if the order was already settled (Delivered)
            // Since status is per-item now, we debit only if those items were delivered
            // For simplicity, we debit if merchant had received it.
            for (const [mId, grossAmount] of Object.entries(merchantAmounts)) {
              const debitId = mId;

              // Calculate Net that was actually credited (to avoid over-debiting merchant)
              const platformFee = Number(
                (grossAmount * (refundPlatformFeeRate / 100)).toFixed(2),
              );
              const gstOnFee = Number(
                (platformFee * (refundGstRate / 100)).toFixed(2),
              );
              // Note: Agent commissions are not reclaimed here for simplicity/safety,
              // but we subtract platform fee and GST to only debit what the merchant actually received.
              const netToDebit = Number(
                (grossAmount - platformFee - gstOnFee).toFixed(2),
              );

              const { ProfileMerchant } =
                await import('../../../../merchant/profile/infrastructure/entities/profile-merchant.entity');
              const merchantProfile = await queryRunner.manager.findOne(
                ProfileMerchant,
                {
                  where: { user_id: debitId },
                  select: ['id'],
                },
              );

              if (merchantProfile) {
                console.log(
                  `[ORDER_CANCELLED_WALLET] Debiting merchant ${merchantProfile.id} for net amount ${netToDebit} (Gross was ${grossAmount}) because order was previously DELIVERED`,
                );

                await this.walletFacade.debit(
                  merchantProfile.id,
                  'merchant_id',
                  netToDebit,
                  TransactionPurpose.REFUND,
                  `order_cancel_debit_${orderInsideTx.id}`,
                  queryRunner,
                  true, // allowNegative
                );
              } else {
                console.error(
                  `[ORDER_CANCELLED_WALLET] Merchant profile not found for user ID: ${debitId}`,
                );
              }
            }

            // Credit Client (Refund)
            await this.walletFacade.credit(
              orderInsideTx.client_id,
              'client_id',
              refundAmount,
              TransactionPurpose.REFUND,
              `order_cancel_refund_${orderInsideTx.id}_${Date.now()}`,
              queryRunner,
            );
            console.log(`[ORDER_CANCELLED_WALLET] Refund successful`);
          }
        }
      }

      await queryRunner.commitTransaction();
      console.log(
        `[ORDER_STATUS_UPDATE] Transaction committed successfully - ID: ${id}`,
      );
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      console.error(
        `[ORDER_STATUS_UPDATE] Transaction failed, rolled back - ID: ${id}, Error:`,
        error,
      );
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
        message = `Items from your order #${id} have been shipped. Use OTP ${deliveryOtpGenerated} for delivery verification.`;
        emailSubject = `Order Shipped - #${id}`;
        break;
      case OrderStatus.DELIVERED: {
        notificationType = NotificationType.ORDER_DELIVERED;
        title = 'Items Delivered';
        message = `Good news! Items from your order #${id} have been successfully delivered.`;
        emailSubject = `Items Delivered - #${id}`;

        // 💰 FINANCIAL SETTLEMENT FOR MERCHANT AND AGENT
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();
        try {
          const orderWithItems = await qr.manager.findOne(Order, {
            where: { id },
            relations: ['items', 'items.product'],
          });

          if (orderWithItems) {
            const txTargetItems = merchantId
              ? orderWithItems.items.filter(
                  (item) => item.product?.merchant_id === merchantId,
                )
              : orderWithItems.items;

            for (const item of txTargetItems) {
              const itemTotal = Number(item.price) * (item.quantity || 1);
              const merchantId = item.product?.merchant_id;

              if (merchantId) {
                const merchantUser = await qr.manager.findOne(User, {
                  where: { id: merchantId },
                });

                const { ProfileMerchant } =
                  await import('../../../../merchant/profile/infrastructure/entities/profile-merchant.entity');
                const merchantProfile = await qr.manager.findOne(
                  ProfileMerchant,
                  {
                    where: { user: { id: merchantId } },
                  },
                );

                // Resolve commissions via rules engine
                const [
                  platformFeeResolved,
                  gstResolved,
                  buyerAgentItemResolved,
                ] = await Promise.all([
                  this.walletFacade.resolveCommission(
                    CommissionEventType.PRODUCT_ORDER,
                    CommissionType.PLATFORM_FEE,
                    merchantProfile?.id ?? null,
                    CommissionAppliesRole.MERCHANT,
                    itemTotal,
                  ),
                  this.walletFacade.resolveCommission(
                    CommissionEventType.PRODUCT_ORDER,
                    CommissionType.GST,
                    null,
                    CommissionAppliesRole.ALL,
                    itemTotal,
                  ),
                  this.walletFacade.resolveCommission(
                    CommissionEventType.PRODUCT_ORDER,
                    CommissionType.BUYER_AGENT,
                    orderWithItems.client_id,
                    CommissionAppliesRole.CLIENT,
                    itemTotal,
                  ),
                ]);

                // 1. Seller's Agent Commission
                let agent_commission = 0;
                let agent_id: string | undefined = undefined;

                if (merchantUser?.referred_by_id && merchantProfile) {
                  agent_id = merchantUser.referred_by_id;
                  const sellerAgentResolved =
                    await this.walletFacade.resolveCommission(
                      CommissionEventType.PRODUCT_ORDER,
                      CommissionType.SELLER_AGENT,
                      merchantProfile.id,
                      CommissionAppliesRole.MERCHANT,
                      itemTotal,
                    );
                  agent_commission = sellerAgentResolved.amount;
                }

                // 2. Buyer's Agent Commission
                let buyer_agent_commission = 0;
                let buyer_agent_id: string | undefined = undefined;

                const buyerUser = await qr.manager.findOne(User, {
                  where: { id: orderWithItems.client_id },
                  select: ['id', 'referred_by_id'],
                });

                if (buyerUser?.referred_by_id) {
                  buyer_agent_id = buyerUser.referred_by_id;
                  buyer_agent_commission = buyerAgentItemResolved.amount;
                }

                // 3. Platform Fee & GST
                const platformFee = platformFeeResolved.amount;
                const gst_rate = gstResolved.amount;
                const gst = Number((platformFee * (gst_rate / 100)).toFixed(2));

                // 4. Final Merchant Net Share
                const merchantNet = Number(
                  (
                    itemTotal -
                    platformFee -
                    gst -
                    agent_commission -
                    buyer_agent_commission
                  ).toFixed(2),
                );

                // --- EXECUTE CREDITS ---

                // A. Credit Merchant
                if (merchantProfile) {
                  await this.walletFacade.credit(
                    merchantProfile.id,
                    'merchant_id',
                    merchantNet,
                    TransactionPurpose.CONSULTATION, // Reusing for earnings
                    `order_item_${item.id}`,
                    qr,
                  );
                }

                // B. Credit Seller's Agent
                if (agent_commission > 0 && agent_id) {
                  const { ProfileAgent } =
                    await import('../../../../agent/infrastructure/entities/profile-agent.entity');
                  const agentProfile = await qr.manager.findOne(ProfileAgent, {
                    where: { user_id: agent_id },
                    select: ['id'],
                  });
                  if (agentProfile) {
                    await this.walletFacade.credit(
                      agentProfile.id,
                      'agent_id',
                      agent_commission,
                      TransactionPurpose.AGENT_COMMISSION,
                      `order_item_${item.id}`,
                      qr,
                    );
                  } else {
                    console.error(
                      `[OrderSettlement] Agent profile not found for user_id: ${agent_id}`,
                    );
                  }
                }

                // C. Credit Buyer's Agent
                if (buyer_agent_commission > 0 && buyer_agent_id) {
                  const { ProfileAgent } =
                    await import('../../../../agent/infrastructure/entities/profile-agent.entity');
                  const agentProfile = await qr.manager.findOne(ProfileAgent, {
                    where: { user_id: buyer_agent_id },
                    select: ['id'],
                  });
                  if (agentProfile) {
                    await this.walletFacade.credit(
                      agentProfile.id,
                      'agent_id',
                      buyer_agent_commission,
                      TransactionPurpose.AGENT_COMMISSION,
                      `order_item_buyer_ref_${item.id}`,
                      qr,
                    );
                  } else {
                    console.error(
                      `[OrderSettlement] Buyer agent profile not found for user_id: ${buyer_agent_id}`,
                    );
                  }
                }

                // Write financial ledger entry
                try {
                  await this.walletFacade.createCommissionSplit(
                    {
                      referenceId: `order_item_${item.id}`,
                      referenceType: SplitReferenceType.ORDER,
                      grossAmount: itemTotal,
                      platformFee,
                      gst,
                      sellerAgentCommission: agent_commission,
                      buyerAgentCommission: buyer_agent_commission,
                      providerNet: merchantNet,
                      clientProfileId: orderWithItems.client_id,
                      providerProfileId: merchantProfile?.id ?? null,
                      sellerAgentProfileId: agent_id ?? null,
                      buyerAgentProfileId: buyer_agent_id ?? null,
                      commissionRuleId: platformFeeResolved.ruleId,
                    },
                    qr,
                  );
                } catch (err) {
                  console.error(
                    `[OrderSettlement] Failed to write ledger entry for item ${item.id}:`,
                    err,
                  );
                }
              }
            }
          }
          await qr.commitTransaction();
        } catch (err: unknown) {
          await qr.rollbackTransaction();
          console.error(
            '[OrderSettlement] Failed to settle order funds:',
            err instanceof Error ? err.message : String(err),
          );
        } finally {
          await qr.release();
        }
        break;
      }
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

    const targetProfileId = order.client_id;

    // Save notification to DB via facade
    await this.notificationFacade.create(
      targetProfileId,
      RoleEnum.CLIENT,
      notificationType,
      title,
      message,
      { orderId: id, status, amount: order.total_amount },
    );

    // Emit real-time socket event to profile
    this.notificationGateway.emitToProfile(
      targetProfileId,
      'order_status_updated',
      {
        orderId: id,
        status,
        title,
        message,
        cancellationReason,
      },
    );

    // Send status update email to user
    try {
      const user = order.client?.user;
      if (user && user.email) {
        let otpSection = '';
        if (status === OrderStatus.SHIPPED && deliveryOtpGenerated) {
          otpSection = `
            <div style="background-color: #f0f7ff; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #cce3ff; text-align: center;">
              <p style="margin: 0; color: #0056b3; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Delivery Verification OTP</p>
              <h1 style="margin: 10px 0; color: #007bff; letter-spacing: 10px; font-size: 32px;">${deliveryOtpGenerated}</h1>
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
              <p style="font-size: 12px; color: #aaa; text-align: center;">Â© 2026 Astrology in Bharat. All rights reserved.</p>
            </div>
          </div>
        `;

        await this.emailService.sendEmail(user.email, emailSubject, emailHtml);
      }
    } catch (emailError) {
      console.error('Failed to send status update email:', emailError);
    }

    return new BooleanMessage();
  }
}
