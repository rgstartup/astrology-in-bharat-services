import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../../infrastructure/entities/dispute.entity';

@Injectable()
export class GetAllDisputesUseCase {
    constructor(
        @InjectRepository(Dispute)
        private readonly disputeRepo: Repository<Dispute>,
    ) { }

    async execute(params?: { status?: string, page?: number, limit?: number }) {
        const { status, page = 1, limit = 10 } = params || {};
        const query = this.disputeRepo.createQueryBuilder('dispute')
            .leftJoinAndSelect('dispute.user', 'user')
            .leftJoinAndSelect('dispute.consultation', 'consultation')
            .leftJoinAndSelect('consultation.expert', 'consultationExpert')
            .leftJoinAndSelect('consultationExpert.user', 'consultationExpertUser')
            .leftJoinAndSelect('dispute.order', 'order')
            .leftJoinAndSelect('dispute.puja', 'puja')
            .leftJoinAndSelect('puja.expert', 'pujaExpert')
            .leftJoinAndSelect('pujaExpert.user', 'pujaExpertUser')
            .orderBy('dispute.created_at', 'DESC');

        if (status && status !== 'all') {
            query.andWhere('dispute.status = :status', { status });
        }

        const items = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        return items;
    }
}
