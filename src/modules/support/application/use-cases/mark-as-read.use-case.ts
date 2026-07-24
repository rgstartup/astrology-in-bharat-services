import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../../infrastructure/entities/dispute.entity';
import { DisputeMessage } from '../../infrastructure/entities/dispute-message.entity';

@Injectable()
export class MarkMessagesAsReadUseCase {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
    @InjectRepository(DisputeMessage)
    private readonly messageRepo: Repository<DisputeMessage>,
  ) {}

  async execute(profileId: string, disputeId: string) {
    const query = this.disputeRepo.createQueryBuilder('dispute')
      .where('dispute.id = :disputeId', { disputeId })
      .andWhere(
        '(dispute.client_id = :profileId OR dispute.expert_id = :profileId)',
        { profileId },
      );

    const dispute = await query.getOne();
    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
    }

    // Mark all unread messages from admin as read by user
    await this.messageRepo.update(
      { dispute_id: disputeId, sender_type: 'admin', is_read: false },
      { is_read: true },
    );

    return { success: true };
  }
}
