import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../../infrastructure/entities/dispute.entity';
import { DisputeMessage } from '../../infrastructure/entities/dispute-message.entity';

@Injectable()
export class GetDisputeMessagesUseCase {
    constructor(
        @InjectRepository(Dispute)
        private readonly disputeRepo: Repository<Dispute>,
        @InjectRepository(DisputeMessage)
        private readonly messageRepo: Repository<DisputeMessage>,
    ) { }

    async execute(userId: string, disputeId: string, isAdmin = false) {
        const query = this.disputeRepo.createQueryBuilder('dispute')
            .leftJoin('dispute.client', 'client')
            .leftJoin('dispute.expert', 'expert')
            .where('dispute.id = :disputeId', { disputeId });

        if (!isAdmin) {
            query.andWhere('(client.user_id = :userId OR expert.user_id = :userId)', { userId });
        }

        const dispute = await query.getOne();

        if (!dispute) {
            throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
        }

        return this.messageRepo.find({
            where: { dispute_id: disputeId },
            order: { created_at: 'ASC' },
        });
    }
}
