import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Dispute,
  DisputeStatus,
} from '../../infrastructure/entities/dispute.entity';
import { SupportGateway } from '../../api/support.gateway';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';
import { OrderItem } from '@/modules/commerce/order/infrastructure/entities/order-item.entity';
import { OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

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

  async execute(disputeId: string, data: { status: string; notes?: string }) {
    const dispute = await this.disputeRepo.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
    }

    const previousStatus = dispute.status;
    dispute.status = data.status as DisputeStatus;
    
    // If the dispute is resolved and it wasn't already resolved, process the refund
    if (dispute.status === DisputeStatus.RESOLVED && previousStatus !== DisputeStatus.RESOLVED) {
      if (dispute.type === 'order' && dispute.item_id) {
         // Verify it's delivered
         const item = await this.dataSource.getRepository(OrderItem).findOne({
           where: { id: dispute.item_id },
           relations: ['product']
         });
         
         if (!item) {
           throw new NotFoundException(`Order item not found for dispute`);
         }
         
         if (item.status !== OrderStatus.DELIVERED) {
           throw new BadRequestException("Cannot process refund. The product must be marked as DELIVERED to deduct funds from the merchant.");
         }
         
         // It is delivered, so debit merchant first
         if (item.product?.merchant_id) {
            const merchantProfile = await this.dataSource.getRepository(ProfileMerchant).findOne({
              where: { user_id: item.product.merchant_id }
            });
            
            if (merchantProfile) {
               // Calculate net to debit
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
                   true // allowNegative
                 );
               } catch(e) {
                 console.error(`[DISPUTE_REFUND_DEBIT] Failed to debit merchant ${merchantProfile.id}:`, e);
               }
            }
         }
      }

      if (dispute.client_id) {
        let refundAmount = 0;
        
        // Extract refund amount from item_details
        if (dispute.item_details) {
           const details = dispute.item_details;
           refundAmount = Number(
             details.amount || details.totalAmount || details.total_amount || 
             details.price || details.totalCost || details.total_cost || 0
           );
        }
        
        if (refundAmount > 0) {
           try {
             await this.walletFacade.credit(
               dispute.client_id,
               'client_id',
               refundAmount,
               TransactionPurpose.REFUND,
               `dispute_refund_${dispute.id}_${Date.now()}`
             );
           } catch (error) {
             console.error(`[DISPUTE_REFUND] Failed to refund dispute ${disputeId}:`, error);
           }
        }
      }
    }

    if (data.notes) {
      // If item_details has notes or description?
      // Actually, we can just save status for now.
    }

    const saved = await this.disputeRepo.save(dispute);
    this.supportGateway.notifyStatusUpdate(disputeId, saved.status, saved);
    return new BooleanMessage();
  }
}

