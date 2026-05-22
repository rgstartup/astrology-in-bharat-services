import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../../infrastructure/entities/dispute.entity';

@Injectable()
export class GetDisputeByIdUseCase {
    constructor(
        @InjectRepository(Dispute)
        private readonly disputeRepo: Repository<Dispute>,
    ) { }

    async execute(userId: string, disputeId: string, isAdmin = false) {
        const query = this.disputeRepo.createQueryBuilder('dispute')
            .leftJoinAndSelect('dispute.client', 'client')
            .leftJoinAndSelect('dispute.expert', 'expert')
            .where('dispute.id = :disputeId', { disputeId });

        if (!isAdmin) {
            query.andWhere('(client.user_id = :userId OR expert.user_id = :userId)', { userId });
        }

        const dispute = await query.getOne();

        if (!dispute) {
            throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
        }

        return dispute;
    }
}
