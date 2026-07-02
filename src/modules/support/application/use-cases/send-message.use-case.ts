import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetDisputeByIdUseCase } from './get-dispute-by-id.use-case';
import { DisputeMessage } from '../../infrastructure/entities/dispute-message.entity';
import { SendDisputeMessageDto } from '../../api/dto/send-dispute-message.dto';

import { SupportGateway } from '../../api/support.gateway';

@Injectable()
export class SendDisputeMessageUseCase {
  constructor(
    private readonly getDisputeByIdUseCase: GetDisputeByIdUseCase,
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
    const dispute = await this.getDisputeByIdUseCase.execute(
      profileId,
      disputeId,
      isAdmin,
    );

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
