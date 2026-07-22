import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Dispute, DisputeStatus } from '@/modules/support/infrastructure/entities/dispute.entity';
import { SupportGateway } from '@/modules/support/api/support.gateway';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';
import { OrderItem } from '@/modules/commerce/order/infrastructure/entities/order-item.entity';
import { OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { Notification, NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { UpdateDisputeStatusDto } from '../../api/dto/update-dispute-status.dto';

@Injectable()
export class UpdateDisputeStatusUseCase {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
    private readonly supportGateway: SupportGateway,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    private readonly dataSource: DataSource,
  ) {}

  async execute(id: string, dto: UpdateDisputeStatusDto) {
    const { status, notes } = dto;
    const dispute = await this.disputeRepo.findOne({ where: { id } });

    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${id} not found`);
    }

    const previousStatus = dispute.status;
    dispute.status = status as DisputeStatus;

    if (dispute.status === DisputeStatus.RESOLVED && previousStatus !== DisputeStatus.RESOLVED) {
      if (dispute.type === 'order' && dispute.item_id) {
        const item = await this.dataSource.getRepository(OrderItem).findOne({
          where: { id: dispute.item_id },
          relations: ['product'],
        });

        if (!item) {
          throw new NotFoundException(`Order item not found for dispute`);
        }

        if (item.status !== OrderStatus.DELIVERED) {
          throw new BadRequestException('Cannot process refund. The product must be marked as DELIVERED to deduct funds from the merchant.');
        }

        if (item.product?.merchant_id) {
          const merchantProfile = await this.dataSource.getRepository(ProfileMerchant).findOne({
            where: { user_id: item.product.merchant_id },
          });

          if (merchantProfile) {
            const grossAmount = Number(item.price) * (item.quantity || 1);
            const refundPlatformFeeRate = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FROM_PUJA_SHOP');
            const refundGstRate = await this.walletFacade.getAdminCommissionFromSetting('GST_PERCENTAGE');
            const platformFee = Number((grossAmount * (refundPlatformFeeRate / 100)).toFixed(2));
            const gstOnFee = Number((platformFee * (refundGstRate / 100)).toFixed(2));
            const netToDebit = Number((grossAmount - platformFee - gstOnFee).toFixed(2));

            try {
              await this.walletFacade.debit(
                merchantProfile.id,
                'merchant_id',
                netToDebit,
                TransactionPurpose.REFUND,
                `dispute_debit_${dispute.id}_${Date.now()}`,
                undefined,
                true,
              );

              const reasonMessage = notes || dispute.description || 'Admin processed refund for a dispute';
              const notification = this.dataSource.getRepository(Notification).create({
                merchant_id: merchantProfile.id,
                type: NotificationType.GENERAL,
                title: 'Wallet Debited due to Refund',
                message: `An amount of ₹${netToDebit} has been debited from your wallet for Order #${item.order_id}. Reason: ${reasonMessage}`,
                metadata: { orderId: item.order_id, disputeId: id },
              });
              await this.dataSource.getRepository(Notification).save(notification);
            } catch (e) {
              console.error(`[DISPUTE_REFUND_DEBIT] Failed to debit merchant ${merchantProfile.id}:`, e);
            }
          }
        }
      }

      if (dispute.client_id) {
        let refundAmount = 0;
        if (dispute.item_details) {
          const details = dispute.item_details;
          refundAmount = Number(
            details.amount || details.totalAmount || details.total_amount ||
            details.price || details.totalCost || details.total_cost || 0,
          );
        }

        if (refundAmount > 0) {
          try {
            await this.walletFacade.credit(
              dispute.client_id,
              'client_id',
              refundAmount,
              TransactionPurpose.REFUND,
              `dispute_refund_${dispute.id}_${Date.now()}`,
            );
          } catch (error) {
            console.error(`[DISPUTE_REFUND] Failed to refund dispute ${id}:`, error);
          }
        }
      }
    }

    const saved = await this.disputeRepo.save(dispute);
    this.supportGateway.notifyStatusUpdate(id, saved.status, saved);
    return new BooleanMessage();
  }
}
