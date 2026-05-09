import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, DisputeStatus } from '../../infrastructure/entities/dispute.entity';

import { SupportGateway } from '../../api/support.gateway';

@Injectable()
export class UpdateDisputeStatusUseCase {
    constructor(
        @InjectRepository(Dispute)
        private readonly disputeRepo: Repository<Dispute>,
        private readonly supportGateway: SupportGateway,
    ) { }

    async execute(disputeId: number, data: { status: string; notes?: string }) {
        const dispute = await this.disputeRepo.findOne({
            where: { id: disputeId },
        });

        if (!dispute) {
            throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
        }

        // We can cast the status or map it
        dispute.status = data.status as DisputeStatus;
        if (data.notes) {
            // If item_details has notes or description?
            // Actually, we can just save status for now.
        }

        const saved = await this.disputeRepo.save(dispute);
        this.supportGateway.notifyStatusUpdate(disputeId, saved.status, saved);
        return saved;
    }
}
