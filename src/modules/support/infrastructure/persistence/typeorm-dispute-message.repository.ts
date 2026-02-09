import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { DisputeMessage, SenderType } from '../../domain/entities/dispute-message.entity';
import { IDisputeMessageRepository } from '../../domain/repositories/dispute-message.repository.interface';

@Injectable()
export class TypeOrmDisputeMessageRepository implements IDisputeMessageRepository {
    constructor(
        @InjectRepository(DisputeMessage)
        private readonly repository: Repository<DisputeMessage>,
    ) { }

    create(data: Partial<DisputeMessage>): DisputeMessage {
        return this.repository.create(data);
    }

    async save(message: DisputeMessage): Promise<DisputeMessage> {
        return this.repository.save(message);
    }

    async findByDisputeId(disputeId: number): Promise<DisputeMessage[]> {
        return this.repository.find({
            where: { disputeId },
            order: { createdAt: 'ASC' },
        });
    }

    async markAsRead(disputeId: number, userId: number): Promise<number> {
        // Mark all messages as read where the sender is NOT the current user
        const result = await this.repository
            .createQueryBuilder()
            .update(DisputeMessage)
            .set({ isRead: true })
            .where('disputeId = :disputeId', { disputeId })
            .andWhere('senderId != :userId', { userId })
            .andWhere('isRead = :isRead', { isRead: false })
            .execute();

        return result.affected || 0;
    }

    async getUnreadCount(disputeId: number, userId: number): Promise<number> {
        // Count unread messages where the sender is NOT the current user
        return this.repository.count({
            where: {
                disputeId,
                senderId: Not(userId),
                isRead: false,
            },
        });
    }
}
