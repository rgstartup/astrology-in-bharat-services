import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, DisputeStatus } from '../../infrastructure/entities/dispute.entity';
import { CreateDisputeDto } from '../../api/dto/create-dispute.dto';

@Injectable()
export class CreateDisputeUseCase {
    constructor(
        @InjectRepository(Dispute)
        private readonly disputeRepo: Repository<Dispute>,
    ) { }

    async execute(userId: number, dto: CreateDisputeDto) {
        const dispute = this.disputeRepo.create({
            user_id: userId,
            type: dto.type,
            category: dto.category,
            description: dto.description,
            status: DisputeStatus.OPEN,
            order_id: dto.orderId,
            item_id: dto.itemId,
            consultation_id: dto.consultationId,
            puja_id: dto.pujaId,
            item_details: dto.itemDetails,
        });

        return this.disputeRepo.save(dispute);
    }
}
