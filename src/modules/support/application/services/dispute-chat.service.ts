import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IDisputeMessageRepository } from '../../domain/repositories/dispute-message.repository.interface';
import { IDisputeRepository } from '../../domain/repositories/dispute.repository.interface';
import { SendMessageDto } from '../dtos/send-message.dto';
import { DisputeMessage, SenderType } from '../../domain/entities/dispute-message.entity';
import { User } from '@/modules/users/domain/entities/user.entity';

import { DisputeChatGateway } from '../../interfaces/gateways/dispute-chat.gateway';

@Injectable()
export class DisputeChatService {
    constructor(
        @Inject(IDisputeMessageRepository)
        private readonly messageRepository: IDisputeMessageRepository,
        @Inject(IDisputeRepository)
        private readonly disputeRepository: IDisputeRepository,
        private readonly chatGateway: DisputeChatGateway,
    ) { }

    async getMessages(disputeId: number, user: User): Promise<any[]> {
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

        const messages = await this.messageRepository.findByDisputeId(disputeId);

        return messages.map((msg) => {
            let senderName = 'User';
            if (msg.senderType === SenderType.ADMIN) {
                senderName = 'Support Team';
            } else if (msg.senderId === dispute.userId && dispute.user) {
                senderName = dispute.user.name || 'User';
            }
            return {
                ...msg,
                senderName,
            };
        });
    }

    async sendMessage(
        disputeId: number,
        user: User,
        dto: SendMessageDto,
        forceUserRole: boolean = false,
    ): Promise<any> {
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

        // Determine senderType: if forceUserRole is true, always use USER
        // Otherwise, use ADMIN if user has admin role
        const senderType = forceUserRole ? SenderType.USER : (isAdmin ? SenderType.ADMIN : SenderType.USER);

        const message = this.messageRepository.create({
            disputeId,
            senderType,
            senderId: user.id,
            message: dto.message,
            attachmentUrl: dto.attachmentUrl,
            attachmentType: dto.attachmentType,
            isRead: false,
        });

        const savedMessage = await this.messageRepository.save(message);

        const senderName = senderType === SenderType.ADMIN ? 'Support Team' : (user.name || 'User');
        const enrichedMessage = { ...savedMessage, senderName };

        this.chatGateway.emitNewMessage(disputeId, enrichedMessage as any);
        return enrichedMessage;
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

        const count = await this.messageRepository.markAsRead(disputeId, user.id);
        if (count > 0) {
            this.chatGateway.emitMessagesRead(disputeId, count);
        }
        return count;
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
