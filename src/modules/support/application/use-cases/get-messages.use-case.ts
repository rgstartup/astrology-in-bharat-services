import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../../infrastructure/persistence/entities/dispute.entity';
import { DisputeMessage } from '../../infrastructure/persistence/entities/dispute-message.entity';

@Injectable()
export class GetDisputeMessagesUseCase {
    constructor(
        @InjectRepository(Dispute)
        private readonly disputeRepo: Repository<Dispute>,
        @InjectRepository(DisputeMessage)
        private readonly messageRepo: Repository<DisputeMessage>,
    ) { }

    async execute(userId: number, disputeId: number, isAdmin = false) {
        const where: any = { id: disputeId };
        if (!isAdmin) {
            where.user_id = userId;
        }

        const dispute = await this.disputeRepo.findOne({ where });

        if (!dispute) {
            throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
        }

        return this.messageRepo.find({
            where: { dispute_id: disputeId },
            order: { created_at: 'ASC' },
        });
    }
}
