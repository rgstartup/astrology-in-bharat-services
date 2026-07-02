import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetDisputeByIdUseCase } from './get-dispute-by-id.use-case';
import { DisputeMessage } from '../../infrastructure/entities/dispute-message.entity';

@Injectable()
export class MarkMessagesAsReadUseCase {
  constructor(
    private readonly getDisputeByIdUseCase: GetDisputeByIdUseCase,
    @InjectRepository(DisputeMessage)
    private readonly messageRepo: Repository<DisputeMessage>,
  ) {}

  async execute(profileId: string, disputeId: string) {
    const _dispute = await this.getDisputeByIdUseCase.execute(
      profileId,
      disputeId,
    );

    // Mark all unread messages from admin as read by user
    await this.messageRepo.update(
      { dispute_id: disputeId, sender_type: 'admin', is_read: false },
      { is_read: true },
    );

    return { success: true };
  }
}
