import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../../infrastructure/persistence/entities/dispute.entity';

@Injectable()
export class GetDisputeByIdUseCase {
    constructor(
        @InjectRepository(Dispute)
        private readonly disputeRepo: Repository<Dispute>,
    ) { }

    async execute(userId: number, disputeId: number, isAdmin = false) {
        const where: any = { id: disputeId };
        if (!isAdmin) {
            where.user_id = userId;
        }

        const dispute = await this.disputeRepo.findOne({
            where,
            relations: ['user'], // Added relation for better details
        });

        if (!dispute) {
            throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
        }

        return dispute;
    }
}
