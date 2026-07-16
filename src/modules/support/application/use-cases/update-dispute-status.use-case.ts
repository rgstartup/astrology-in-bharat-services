import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Dispute,
  DisputeStatus,
} from '../../infrastructure/entities/dispute.entity';
import { SupportGateway } from '../../api/support.gateway';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';

@Injectable()
export class UpdateDisputeStatusUseCase {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
    private readonly supportGateway: SupportGateway,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
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

