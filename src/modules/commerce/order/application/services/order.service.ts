import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/entities/order.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import { Notification, NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

import { TransactionPurpose, Transaction, TransactionType } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';
import { Wallet } from '@/modules/finance/wallet/infrastructure/entities/wallet.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { CommissionRule, CommissionType, CommissionEventType, CommissionAppliesRole, CommissionRateType } from '@/modules/finance/commissions/infrastructure/entities/commission-rule.entity';
import { CommissionSplit, SplitReferenceType } from '@/modules/finance/commissions/infrastructure/entities/commission-split.entity';
import { LedgerQueueService } from '@/core/queue/services/ledger-queue.service';
import { GeneralLedgerEntryType, GeneralLedgerEventType, GeneralLedgerPartyType } from '@/modules/finance/general-ledger/infrastructure/entities/general-ledger-entry.entity';
import { generateTransactionNo } from '@/common/utils/transaction-no.util';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private notificationGateway: NotificationGateway,
    private emailService: NodeMailerService,
    private ledgerQueueService: LedgerQueueService,
    private dataSource: DataSource,
  ) {}

  async updateOrderStatus(
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

    const targetItems = merchantId
      ? order.items.filter((item) => item.product?.merchant_id === merchantId)
      : order.items;

    if (targetItems.length === 0) {
      throw new ForbiddenException(
        'No items found for this merchant in this order.',
      );
    }

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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let deliveryOtpGenerated: string | null = null;

    try {
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

      await queryRunner.manager.save(Order, order);

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

      if (status === OrderStatus.CANCELLED) {
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

          for (const item of txTargetItems) {
            if (item.product) {
              const product = item.product;
              product.stock += item.quantity;
              await queryRunner.manager.save(Product, product);
            }
          }

          let refundAmount = txTargetItems.reduce(
            (sum, item) => sum + Number(item.price) * item.quantity,
            0,
          );

          if (refundAmount > 0) {
            const isFullCancellation = orderInsideTx.items.every(
              (item) => item.status === OrderStatus.CANCELLED,
            );

            if (isFullCancellation) {
              const platformFee = await this.getAdminCommissionFromSetting(queryRunner.manager, 'PLATFORM_FEE');
              const shippingCharge = Number(orderInsideTx.shipping_charge) || 0;
              refundAmount += platformFee + shippingCharge;
            }

            await this.credit(
              queryRunner.manager,
              orderInsideTx.client_id,
              'client_id',
              refundAmount,
              TransactionPurpose.REFUND,
              `order_cancel_refund_${orderInsideTx.id}_${Date.now()}`,
            );
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

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

                const [
                  platformFeeResolved,
                  gstResolved,
                  buyerAgentItemResolved,
                ] = await Promise.all([
                  this.resolveCommission(
                    qr.manager,
                    CommissionEventType.PRODUCT_ORDER,
                    CommissionType.PLATFORM_FEE,
                    merchantProfile?.id ?? null,
                    CommissionAppliesRole.MERCHANT,
                    itemTotal,
                  ),
                  this.resolveCommission(
                    qr.manager,
                    CommissionEventType.PRODUCT_ORDER,
                    CommissionType.GST,
                    null,
                    CommissionAppliesRole.ALL,
                    itemTotal,
                  ),
                  this.resolveCommission(
                    qr.manager,
                    CommissionEventType.PRODUCT_ORDER,
                    CommissionType.BUYER_AGENT,
                    orderWithItems.client_id,
                    CommissionAppliesRole.CLIENT,
                    itemTotal,
                  ),
                ]);

                let agent_commission = 0;
                let agent_id: string | undefined = undefined;

                if (merchantUser?.referred_by_id && merchantProfile) {
                  agent_id = merchantUser.referred_by_id;
                  const sellerAgentResolved =
                    await this.resolveCommission(
                      qr.manager,
                      CommissionEventType.PRODUCT_ORDER,
                      CommissionType.SELLER_AGENT,
                      merchantProfile.id,
                      CommissionAppliesRole.MERCHANT,
                      itemTotal,
                    );
                  agent_commission = sellerAgentResolved.amount;
                }

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

                const platformFee = platformFeeResolved.amount;
                const gst_rate = gstResolved.amount;
                const gst = Number((platformFee * (gst_rate / 100)).toFixed(2));

                const merchantNet = Number(
                  (
                    itemTotal -
                    platformFee -
                    gst -
                    agent_commission -
                    buyer_agent_commission
                  ).toFixed(2),
                );

                if (merchantProfile) {
                  await this.credit(
                    qr.manager,
                    merchantProfile.id,
                    'merchant_id',
                    merchantNet,
                    TransactionPurpose.CONSULTATION,
                    `order_item_${item.id}`,
                  );
                }

                if (agent_commission > 0 && agent_id) {
                  const { ProfileAgent } =
                    await import('../../../../agent/infrastructure/entities/profile-agent.entity');
                  const agentProfile = await qr.manager.findOne(ProfileAgent, {
                    where: { user_id: agent_id },
                    select: ['id'],
                  });
                  if (agentProfile) {
                    await this.credit(
                      qr.manager,
                      agentProfile.id,
                      'agent_id',
                      agent_commission,
                      TransactionPurpose.AGENT_COMMISSION,
                      `order_item_${item.id}`,
                    );
                  }
                }

                if (buyer_agent_commission > 0 && buyer_agent_id) {
                  const { ProfileAgent } =
                    await import('../../../../agent/infrastructure/entities/profile-agent.entity');
                  const agentProfile = await qr.manager.findOne(ProfileAgent, {
                    where: { user_id: buyer_agent_id },
                    select: ['id'],
                  });
                  if (agentProfile) {
                    await this.credit(
                      qr.manager,
                      agentProfile.id,
                      'agent_id',
                      buyer_agent_commission,
                      TransactionPurpose.AGENT_COMMISSION,
                      `order_item_buyer_ref_${item.id}`,
                    );
                  }
                }

                try {
                  await this.createCommissionSplit(
                    qr.manager,
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
        notificationType = NotificationType.ORDER_PLACED;
        title = 'Order Processing';
        message = `Your order #${id} is now being processed by the merchant.`;
        emailSubject = `Order Update - Processing #${id}`;
        break;
      default:
        return new BooleanMessage();
    }

    const targetProfileId = order.client_id;

    const notificationRepo = this.dataSource.getRepository(Notification);
    const notification = notificationRepo.create({
      client_id: targetProfileId,
      type: notificationType,
      title,
      message,
      metadata: { orderId: id, status, amount: order.total_amount },
    });
    await notificationRepo.save(notification);

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
              <p style="font-size: 12px; color: #aaa; text-align: center;">© 2026 Astrology in Bharat. All rights reserved.</p>
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

  private async getAdminCommissionFromSetting(manager: any, key: string): Promise<number> {
    try {
      let setting = await manager.findOne(SystemSetting, { where: { key } });
      if (!setting) {
        const altKey = key.includes('COMMISSION')
          ? key.replace('COMMISSION', 'COMMISION')
          : key.replace('COMMISION', 'COMMISSION');
        setting = await manager.findOne(SystemSetting, { where: { key: altKey } });
      }
      if (setting && setting.value) {
        return parseFloat(setting.value);
      }
    } catch (e) {
      console.error(`[UpdateOrderStatus] Failed to fetch setting ${key}:`, e);
    }
    return 3;
  }

  private async resolveCommission(
    manager: any,
    eventType: CommissionEventType,
    commissionType: CommissionType,
    profileId: string | null,
    role: CommissionAppliesRole,
    grossAmount: number,
  ): Promise<{ amount: number; ruleId: string | null }> {
    const now = new Date();

    const rules = await manager.find(CommissionRule, {
      where: {
        event_type: eventType,
        commission_type: commissionType,
        is_active: true,
      },
      relations: ['tiers'],
      order: { priority: 'DESC' },
    });

    const activeRules = rules.filter(
      (r: any) =>
        r.effective_from <= now &&
        (r.effective_until === null || r.effective_until >= now),
    );

    const rule: any =
      (profileId
        ? activeRules.find((r: any) => r.applies_to_id === profileId)
        : undefined) ??
      activeRules.find(
        (r: any) => r.applies_to_role === role && r.applies_to_id === null,
      ) ??
      activeRules.find(
        (r: any) =>
          r.applies_to_role === CommissionAppliesRole.ALL &&
          r.applies_to_id === null,
      );

    if (!rule) {
      const legacyAmount = await this.fromLegacySetting(
        manager,
        eventType,
        commissionType,
        grossAmount,
      );
      return { amount: legacyAmount, ruleId: null };
    }

    const matchedTier = (rule.tiers ?? []).find(
      (t: any) =>
        grossAmount >= Number(t.from_amount) &&
        (t.to_amount === null || grossAmount <= Number(t.to_amount)),
    );
    const effectiveRate = matchedTier?.rate ?? rule.rate;
    const effectiveMinCap = matchedTier?.min_cap ?? rule.min_cap;
    const effectiveMaxCap = matchedTier?.max_cap ?? rule.max_cap;

    let raw =
      rule.rate_type === CommissionRateType.FIXED
        ? Number(effectiveRate)
        : grossAmount * (Number(effectiveRate) / 100);

    if (effectiveMinCap !== null && effectiveMinCap !== undefined) {
      raw = Math.max(raw, Number(effectiveMinCap));
    }
    if (effectiveMaxCap !== null && effectiveMaxCap !== undefined) {
      raw = Math.min(raw, Number(effectiveMaxCap));
    }

    return { amount: Number(raw.toFixed(2)), ruleId: rule.id };
  }

  private async fromLegacySetting(
    manager: any,
    eventType: CommissionEventType,
    commissionType: CommissionType,
    grossAmount: number,
  ): Promise<number> {
    const LEGACY_SETTING_MAP: Partial<
      Record<CommissionEventType, Partial<Record<CommissionType, string[]>>>
    > = {
      [CommissionEventType.CHAT]: {
        [CommissionType.PLATFORM_FEE]: [
          'COMMISION_FROM_ASTROLOGER',
          'COMMISSION_FROM_ASTROLOGER',
        ],
        [CommissionType.SELLER_AGENT]: [
          'COMMISION_FROM_ASTROLOGER',
          'COMMISSION_FROM_ASTROLOGER',
        ],
        [CommissionType.BUYER_AGENT]: [
          'COMMISION_FOR_BUYER_AGENT',
          'COMMISSION_FOR_BUYER_AGENT',
        ],
        [CommissionType.GST]: ['GST_PERCENTAGE'],
      },
      [CommissionEventType.CALL]: {
        [CommissionType.PLATFORM_FEE]: [
          'COMMISION_FROM_ASTROLOGER',
          'COMMISSION_FROM_ASTROLOGER',
        ],
        [CommissionType.SELLER_AGENT]: [
          'COMMISION_FROM_ASTROLOGER',
          'COMMISSION_FROM_ASTROLOGER',
        ],
        [CommissionType.BUYER_AGENT]: [
          'COMMISION_FOR_BUYER_AGENT',
          'COMMISSION_FOR_BUYER_AGENT',
        ],
        [CommissionType.GST]: ['GST_PERCENTAGE'],
      },
      [CommissionEventType.PUJA]: {
        [CommissionType.PLATFORM_FEE]: [
          'COMMISION_FROM_ASTROLOGER',
          'COMMISSION_FROM_ASTROLOGER',
        ],
        [CommissionType.SELLER_AGENT]: [
          'COMMISION_FROM_ASTROLOGER',
          'COMMISSION_FROM_ASTROLOGER',
        ],
        [CommissionType.BUYER_AGENT]: [
          'COMMISION_FOR_BUYER_AGENT',
          'COMMISSION_FOR_BUYER_AGENT',
        ],
        [CommissionType.GST]: ['GST_PERCENTAGE'],
      },
      [CommissionEventType.PRODUCT_ORDER]: {
        [CommissionType.PLATFORM_FEE]: [
          'COMMISION_FROM_PUJA_SHOP',
          'COMMISSION_FROM_PUJA_SHOP',
        ],
        [CommissionType.SELLER_AGENT]: [
          'COMMISION_FROM_PUJA_SHOP',
          'COMMISSION_FROM_PUJA_SHOP',
        ],
        [CommissionType.BUYER_AGENT]: [
          'COMMISION_FOR_BUYER_AGENT',
          'COMMISSION_FOR_BUYER_AGENT',
        ],
        [CommissionType.GST]: ['GST_PERCENTAGE'],
      },
    };

    const DEFAULT_RATES: Partial<Record<CommissionType, number>> = {
      [CommissionType.PLATFORM_FEE]: 3,
      [CommissionType.SELLER_AGENT]: 3,
      [CommissionType.BUYER_AGENT]: 3,
      [CommissionType.GST]: 18,
    };

    const keys = LEGACY_SETTING_MAP[eventType]?.[commissionType] ?? [];
    for (const key of keys) {
      const setting = await manager.findOne(SystemSetting, { where: { key } });
      if (setting?.value) {
        const rate = parseFloat(setting.value);
        if (commissionType === CommissionType.GST) {
          return rate;
        }
        return Number((grossAmount * (rate / 100)).toFixed(2));
      }
    }
    const defaultRate = DEFAULT_RATES[commissionType] ?? 3;
    if (commissionType === CommissionType.GST) return defaultRate;
    return Number((grossAmount * (defaultRate / 100)).toFixed(2));
  }

  private async credit(
    manager: any,
    profileId: string,
    walletKey: string,
    amount: number,
    purpose: TransactionPurpose,
    referenceId?: string,
  ): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    let wallet = await manager.findOne(Wallet, {
      where: { [walletKey]: profileId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) {
      const newWallet = new Wallet();
      Object.assign(newWallet, { [walletKey]: profileId });
      newWallet.balance = 0;
      newWallet.reserved_balance = 0;
      wallet = await manager.save(Wallet, newWallet);
    }

    await manager
      .createQueryBuilder()
      .update(Wallet)
      .set({ balance: () => `balance + ${Number(amount)}` })
      .where(`${walletKey} = :profileId`, { profileId })
      .execute();

    const balanceBefore = Number(wallet.balance) || 0;
    const balanceAfter = balanceBefore + Number(amount);

    const transaction = manager.create(Transaction, {
      wallet_id: wallet.id,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      type: TransactionType.CREDIT,
      purpose,
      reference_id: referenceId,
    });
    const savedTx = await manager.save(Transaction, transaction);

    try {
      const roleForTx =
        walletKey === 'expert_id'
          ? 'EXPERT'
          : walletKey === 'merchant_id'
            ? 'MERCHANT'
            : walletKey === 'agent_id'
              ? 'AGENT'
              : 'CLIENT';

      savedTx.transaction_no = generateTransactionNo(
        roleForTx,
        purpose,
        savedTx.id,
      );
      await manager.save(Transaction, savedTx);
    } catch (err) {
      console.error(`[CREDIT_TX] Failed to generate transaction no: ${(err as Error).message}`);
    }

    const purposeToLedgerEventType: Record<TransactionPurpose, GeneralLedgerEventType> = {
      [TransactionPurpose.RECHARGE]: GeneralLedgerEventType.RECHARGE,
      [TransactionPurpose.CONSULTATION]: GeneralLedgerEventType.CONSULTATION,
      [TransactionPurpose.REFUND]: GeneralLedgerEventType.REFUND,
      [TransactionPurpose.WITHDRAWAL]: GeneralLedgerEventType.WITHDRAWAL,
      [TransactionPurpose.PRODUCT_PURCHASE]: GeneralLedgerEventType.PRODUCT_ORDER,
      [TransactionPurpose.PUJA_CONFIRMATION]: GeneralLedgerEventType.PUJA,
      [TransactionPurpose.AGENT_COMMISSION]: GeneralLedgerEventType.AGENT_COMMISSION,
    };

    const walletKeyToPartyType: Record<string, GeneralLedgerPartyType> = {
      client_id: GeneralLedgerPartyType.CLIENT,
      expert_id: GeneralLedgerPartyType.EXPERT,
      merchant_id: GeneralLedgerPartyType.MERCHANT,
      agent_id: GeneralLedgerPartyType.AGENT,
    };

    void this.ledgerQueueService.enqueue({
      event_id: referenceId ?? null,
      event_type: purposeToLedgerEventType[purpose],
      entry_type: GeneralLedgerEntryType.CREDIT,
      party_type: walletKeyToPartyType[walletKey] ?? GeneralLedgerPartyType.CLIENT,
      party_id: profileId,
      amount,
    });

    if (
      walletKey === 'expert_id' &&
      (purpose === TransactionPurpose.CONSULTATION ||
        purpose === TransactionPurpose.PRODUCT_PURCHASE)
    ) {
      try {
        const expertProfile = await manager.findOne(ProfileExpert, {
          where: { id: profileId },
          select: ['id'],
        });

        if (expertProfile) {
          await manager
            .createQueryBuilder()
            .update(ProfileExpert)
            .set({
              total_earning: () => `COALESCE(total_earning, 0) + ${Number(amount)}`,
            })
            .where('id = :id', { id: expertProfile.id })
            .execute();
        }
      } catch (e) {
        console.error(`[CREDIT_TX] Earning tracking failed: ${(e as Error).message}`);
      }
    }

    return wallet;
  }

  private async createCommissionSplit(
    manager: any,
    input: any,
  ): Promise<CommissionSplit> {
    const split = new CommissionSplit();
    split.reference_id = input.referenceId;
    split.reference_type = input.referenceType;
    split.gross_amount = input.grossAmount;
    split.platform_fee = input.platformFee;
    split.gst = input.gst;
    split.seller_agent_commission = input.sellerAgentCommission;
    split.buyer_agent_commission = input.buyerAgentCommission;
    split.provider_net = input.providerNet;
    split.platform_net = Number((input.platformFee + input.gst).toFixed(2));
    split.client_profile_id = input.clientProfileId ?? null;
    split.provider_profile_id = input.providerProfileId ?? null;
    split.seller_agent_profile_id = input.sellerAgentProfileId ?? null;
    split.buyer_agent_profile_id = input.buyerAgentProfileId ?? null;
    split.commission_rule_id = input.commissionRuleId ?? null;

    const saved = await manager.save(CommissionSplit, split);

    const splitRefTypeToLedgerEventType: Record<SplitReferenceType, GeneralLedgerEventType> = {
      [SplitReferenceType.CHAT]: GeneralLedgerEventType.CONSULTATION,
      [SplitReferenceType.CALL]: GeneralLedgerEventType.CONSULTATION,
      [SplitReferenceType.PUJA]: GeneralLedgerEventType.PUJA,
      [SplitReferenceType.ORDER]: GeneralLedgerEventType.PRODUCT_ORDER,
    };

    if (saved.platform_net > 0) {
      void this.ledgerQueueService.enqueue({
        event_id: saved.reference_id,
        event_type: splitRefTypeToLedgerEventType[saved.reference_type],
        entry_type: GeneralLedgerEntryType.CREDIT,
        party_type: GeneralLedgerPartyType.PLATFORM,
        party_id: null,
        amount: saved.platform_net,
        note: `platform_fee=${saved.platform_fee} gst=${saved.gst}`,
      });
    }

    return saved;
  }
}
