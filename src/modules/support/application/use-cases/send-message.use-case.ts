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
  ) {}

  async execute(
    profileId: string,
    disputeId: string,
    dto: SendDisputeMessageDto,
    isAdmin = false,
  ) {
    const query = this.disputeRepo.createQueryBuilder('dispute')
      .where('dispute.id = :disputeId', { disputeId });

    if (!isAdmin) {
      query.andWhere(
        '(dispute.client_id = :profileId OR dispute.expert_id = :profileId)',
        { profileId },
      );
    }

    const dispute = await query.getOne();
    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
    }

    let clientId: string | null = null;
    let expert_id: string | null = null;

    if (!isAdmin) {
      if (dispute.client_id === profileId) {
        clientId = dispute.client_id;
      } else if (dispute.expert_id === profileId) {
        expert_id = dispute.expert_id;
      }
    }

    const newMessage = this.messageRepo.create({
      dispute_id: disputeId,
      client_id: clientId,
      expert_id: expert_id,
      sender_type: isAdmin ? 'admin' : 'user',
      message: dto.message,
    });

    const saved = await this.messageRepo.save(newMessage);
    this.supportGateway.notifyNewMessage(disputeId, saved);
    return saved;
  }
}
