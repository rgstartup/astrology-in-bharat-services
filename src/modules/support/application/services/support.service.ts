import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IDisputeRepository } from '../../domain/repositories/dispute.repository.interface';
import { CreateDisputeDto } from '../dtos/create-dispute.dto';
import { UpdateDisputeStatusDto } from '../dtos/update-dispute-status.dto';
import { Dispute, DisputeStatus } from '../../domain/entities/dispute.entity';
import { IDisputeMessageRepository } from '../../domain/repositories/dispute-message.repository.interface';
import { SenderType } from '../../domain/entities/dispute-message.entity';

import { DisputeChatGateway } from '../../interfaces/gateways/dispute-chat.gateway';

@Injectable()
export class SupportService {
    constructor(
        @Inject(IDisputeRepository)
        private readonly disputeRepository: IDisputeRepository,
        @Inject(IDisputeMessageRepository)
        private readonly messageRepository: IDisputeMessageRepository,

        private readonly chatGateway: DisputeChatGateway,
    ) { }

    async createDispute(userId: number, dto: CreateDisputeDto): Promise<Dispute> {
        // Map orderId or consultationId to itemId for backward compatibility
        const itemId = dto.itemId || dto.orderId || dto.consultationId;

        if (!itemId || isNaN(Number(itemId))) {
            throw new BadRequestException('Invalid itemId, orderId, or consultationId provided');
        }

        try {
            const dispute = this.disputeRepository.create({
                type: dto.type,
                itemId,
                category: dto.category,
                description: dto.description,
                itemDetails: dto.itemDetails,
                userId,
                status: DisputeStatus.PENDING,
            });

            return await this.disputeRepository.save(dispute);
        } catch (error) {
            console.error('Error creating dispute:', error);
            throw error;
        }
    }

    async getAllDisputes(
        filters?: any,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ data: Dispute[]; total: number }> {
        return this.disputeRepository.findAll(filters, page, limit);
    }

    async getUserDisputes(
        userId: number,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ data: Dispute[]; total: number }> {
        return this.disputeRepository.findAll({ userId }, page, limit);
    }

    async getDisputeById(id: number): Promise<Dispute> {
        const dispute = await this.disputeRepository.findById(id);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }
        return dispute;
    }

    async updateDisputeStatus(id: number, dto: UpdateDisputeStatusDto): Promise<Dispute> {
        const dispute = await this.getDisputeById(id);

        // Map notes to adminNotes if provided
        if (dto.notes && !dto.adminNotes) {
            dto.adminNotes = dto.notes;
        }

        // Clean up notes from dto before passing to repository if it's strict
        const { notes, ...updateData } = dto;

        await this.disputeRepository.update(id, updateData);
        return this.getDisputeById(id);
    }

    async getDisputeStats(): Promise<any> {
        return this.disputeRepository.getStats();
    }

    /**
     * Helper to add computed fields to dispute
     */
    enrichDisputeWithMetadata(dispute: Dispute): any {
        const closedStatuses = [DisputeStatus.CLOSE_REQUESTED, DisputeStatus.CLOSED, DisputeStatus.RESOLVED];
        return {
            ...dispute,
            canSendMessage: !closedStatuses.includes(dispute.status),
        };
    }

    /**
     * User requests to close the dispute
     */
    async requestCloseDispute(id: number, userId: number, reason?: string): Promise<Dispute> {
        const dispute = await this.getDisputeById(id);

        if (dispute.userId !== userId) {
            throw new NotFoundException('Dispute not found');
        }

        const userName = dispute.user?.name || 'User';

        await this.disputeRepository.update(id, {
            status: DisputeStatus.CLOSE_REQUESTED,
            adminNotes: reason ? `User close request reason: ${reason}` : 'User requested to close this dispute',
        });

        // Save system message
        await this.messageRepository.save(this.messageRepository.create({
            disputeId: id,
            senderType: SenderType.USER,
            senderId: userId,
            message: reason ? `Reason: ${reason}` : 'User requested to end the chat',
            // isSystemNote: true,
        }));

        const updatedDispute = await this.getDisputeById(id);

        this.chatGateway.emitDisputeCloseRequested(id, {
            disputeId: id,
            userId: dispute.userId,
            userName: userName,
            reason: reason || null,
        });

        return updatedDispute;
    }

    /**
     * Admin closes the dispute with feedback
     */
    async closeDispute(id: number, feedback: string, finalStatus: DisputeStatus): Promise<Dispute> {
        const dispute = await this.getDisputeById(id);

        if (finalStatus !== DisputeStatus.RESOLVED && finalStatus !== DisputeStatus.CLOSED) {
            throw new Error('Final status must be either RESOLVED or CLOSED');
        }

        await this.disputeRepository.update(id, {
            status: finalStatus,
            adminFeedback: feedback,
            closedAt: new Date(),
        });

        // Save system message
        await this.messageRepository.save(this.messageRepository.create({
            disputeId: id,
            senderType: SenderType.ADMIN,
            senderId: 0, // System/Admin
            message: `Dispute ${finalStatus === DisputeStatus.RESOLVED ? 'resolved' : 'closed'}. Admin feedback: ${feedback}`,
            // isSystemNote: true,
        }));

        const updatedDispute = await this.getDisputeById(id);

        this.chatGateway.emitDisputeClosed(id, {
            disputeId: id,
            status: finalStatus,
            adminFeedback: feedback,
            closedAt: updatedDispute.closedAt,
        });

        return updatedDispute;
    }
}
