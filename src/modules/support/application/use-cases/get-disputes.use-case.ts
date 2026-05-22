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

    async execute(userId: string) {
        return this.disputeRepo.createQueryBuilder('dispute')
            .leftJoin('dispute.client', 'client')
            .leftJoin('dispute.expert', 'expert')
            .where('client.user_id = :userId OR expert.user_id = :userId', { userId })
            .orderBy('dispute.created_at', 'DESC')
            .getMany();
    }
}
