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

    async execute(userId: number, disputeId: number, dto: SendDisputeMessageDto, isAdmin = false) {
        const where: any = { id: disputeId };
        if (!isAdmin) {
            where.user_id = userId;
        }

        const dispute = await this.disputeRepo.findOne({ where });

        if (!dispute) {
            throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
        }

        const newMessage = this.messageRepo.create({
            dispute_id: disputeId,
            sender_id: userId,
            sender_type: isAdmin ? 'admin' : 'user',
            message: dto.message,
        });

        const saved = await this.messageRepo.save(newMessage);
        this.supportGateway.notifyNewMessage(disputeId, saved);
        return saved;
    }
}
