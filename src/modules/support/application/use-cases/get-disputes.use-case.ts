import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../../infrastructure/entities/dispute.entity';

@Injectable()
export class GetDisputesUseCase {
    constructor(
        @InjectRepository(Dispute)
        private readonly disputeRepo: Repository<Dispute>,
    ) { }

    async execute(userId: number) {
        return this.disputeRepo.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
        });
    }
}
