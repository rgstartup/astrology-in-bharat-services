import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, DisputeStatus } from '../../infrastructure/entities/dispute.entity';
import { CreateDisputeDto } from '../../api/dto/create-dispute.dto';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

@Injectable()
export class CreateDisputeUseCase {
    constructor(
        @InjectRepository(Dispute)
        private readonly disputeRepo: Repository<Dispute>,
    ) { }

    async execute(userId: string, dto: CreateDisputeDto) {
        const client = await this.disputeRepo.manager.findOne(ProfileClient, { where: { user_id: userId } });
        const expert = await this.disputeRepo.manager.findOne(ProfileExpert, { where: { user_id: userId } });

        const dispute = this.disputeRepo.create({
            client_id: client ? client.id : null,
            expert_id: expert ? expert.id : null,
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
