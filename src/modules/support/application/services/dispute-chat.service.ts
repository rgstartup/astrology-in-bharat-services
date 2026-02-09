import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IDisputeMessageRepository } from '../../domain/repositories/dispute-message.repository.interface';
import { IDisputeRepository } from '../../domain/repositories/dispute.repository.interface';
import { SendMessageDto } from '../dtos/send-message.dto';
import { DisputeMessage, SenderType } from '../../domain/entities/dispute-message.entity';
import { User } from '@/modules/users/domain/entities/user.entity';

@Injectable()
export class DisputeChatService {
    constructor(
        @Inject(IDisputeMessageRepository)
        private readonly messageRepository: IDisputeMessageRepository,
        @Inject(IDisputeRepository)
        private readonly disputeRepository: IDisputeRepository,
    ) { }

    async getMessages(disputeId: number, user: User): Promise<DisputeMessage[]> {
        // Verify dispute exists and user has access
        const dispute = await this.disputeRepository.findById(disputeId);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        // Check if user is the dispute owner or admin
        const isAdmin = user.roles?.some((r) => r.name === 'admin');
        if (!isAdmin && dispute.userId !== user.id) {
            throw new ForbiddenException('You do not have access to this dispute');
        }

        return this.messageRepository.findByDisputeId(disputeId);
    }

    async sendMessage(
        disputeId: number,
        user: User,
        dto: SendMessageDto,
    ): Promise<DisputeMessage> {
        // Verify dispute exists and user has access
        const dispute = await this.disputeRepository.findById(disputeId);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        const isAdmin = user.roles?.some((r) => r.name === 'admin');
        if (!isAdmin && dispute.userId !== user.id) {
            throw new ForbiddenException('You do not have access to this dispute');
        }

        // Validate that either message or attachment is provided
        if (!dto.message && !dto.attachmentUrl) {
            throw new Error('Either message or attachment must be provided');
        }

        const message = this.messageRepository.create({
            disputeId,
            senderType: isAdmin ? SenderType.ADMIN : SenderType.USER,
            senderId: user.id,
            message: dto.message,
            attachmentUrl: dto.attachmentUrl,
            attachmentType: dto.attachmentType,
            isRead: false,
        });

        return this.messageRepository.save(message);
    }

    async markMessagesAsRead(disputeId: number, user: User): Promise<number> {
        // Verify dispute exists and user has access
        const dispute = await this.disputeRepository.findById(disputeId);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        const isAdmin = user.roles?.some((r) => r.name === 'admin');
        if (!isAdmin && dispute.userId !== user.id) {
            throw new ForbiddenException('You do not have access to this dispute');
        }

        return this.messageRepository.markAsRead(disputeId, user.id);
    }

    async getUnreadCount(disputeId: number, user: User): Promise<number> {
        // Verify dispute exists and user has access
        const dispute = await this.disputeRepository.findById(disputeId);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        const isAdmin = user.roles?.some((r) => r.name === 'admin');
        if (!isAdmin && dispute.userId !== user.id) {
            throw new ForbiddenException('You do not have access to this dispute');
        }

        return this.messageRepository.getUnreadCount(disputeId, user.id);
    }
}
