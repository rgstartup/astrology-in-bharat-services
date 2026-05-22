import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../../infrastructure/entities/dispute.entity';
import { DisputeMessage } from '../../infrastructure/entities/dispute-message.entity';
import { SendDisputeMessageDto } from '../../api/dto/send-dispute-message.dto';

import { SupportGateway } from '../../api/support.gateway';

@Injectable()
export class SendDisputeMessageUseCase {
    constructor(
        @InjectRepository(Dispute)
        private readonly disputeRepo: Repository<Dispute>,
        @InjectRepository(DisputeMessage)
        private readonly messageRepo: Repository<DisputeMessage>,
        private readonly supportGateway: SupportGateway,
    ) { }

    async execute(userId: string, disputeId: string, dto: SendDisputeMessageDto, isAdmin = false) {
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

        let clientId: string | null = null;
        let expertId: string | null = null;

        if (!isAdmin) {
            if (dispute.client && dispute.client.user_id === userId) {
                clientId = dispute.client_id;
            } else if (dispute.expert && dispute.expert.user_id === userId) {
                expertId = dispute.expert_id;
            }
        }

        const newMessage = this.messageRepo.create({
            dispute_id: disputeId,
            client_id: clientId,
            expert_id: expertId,
            sender_type: isAdmin ? 'admin' : 'user',
            message: dto.message,
        });

        const saved = await this.messageRepo.save(newMessage);
        this.supportGateway.notifyNewMessage(disputeId, saved);
        return saved;
    }
}
