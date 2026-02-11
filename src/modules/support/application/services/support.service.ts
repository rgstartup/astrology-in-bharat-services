import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IDisputeRepository } from '../../domain/repositories/dispute.repository.interface';
import { CreateDisputeDto } from '../dtos/create-dispute.dto';
import { UpdateDisputeStatusDto } from '../dtos/update-dispute-status.dto';
import { Dispute, DisputeStatus } from '../../domain/entities/dispute.entity';
import { IDisputeMessageRepository } from '../../domain/repositories/dispute-message.repository.interface';
import { SenderType } from '../../domain/entities/dispute-message.entity';

import { DisputeChatGateway } from '../../interfaces/gateways/dispute-chat.gateway';
import { ChatService } from '@/modules/chat/application/services/chat.service';
import { OrderService } from '@/modules/order/application/services/order.service';

@Injectable()
export class SupportService {
    constructor(
        @Inject(IDisputeRepository)
        private readonly disputeRepository: IDisputeRepository,
        @Inject(IDisputeMessageRepository)
        private readonly messageRepository: IDisputeMessageRepository,
        private readonly chatGateway: DisputeChatGateway,
        private readonly chatService: ChatService,
        private readonly orderService: OrderService,
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
    ): Promise<{ data: any[]; total: number }> {
        const { data, total } = await this.disputeRepository.findAll(filters, page, limit);
        const enrichedData = await Promise.all(data.map(d => this.enrichDispute(d)));
        return { data: enrichedData, total };
    }

    async getUserDisputes(
        userId: number,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ data: any[]; total: number }> {
        const { data, total } = await this.disputeRepository.findAll({ userId }, page, limit);
        const enrichedData = await Promise.all(data.map(d => this.enrichDispute(d)));
        return { data: enrichedData, total };
    }

    async getDisputeById(id: number): Promise<any> {
        const dispute = await this.disputeRepository.findById(id);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }
        return this.enrichDispute(dispute);
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
    async enrichDispute(dispute: Dispute): Promise<any> {
        const closedStatuses = [DisputeStatus.CLOSE_REQUESTED, DisputeStatus.CLOSED, DisputeStatus.RESOLVED];
        const enriched: any = {
            ...dispute,
            canSendMessage: !closedStatuses.includes(dispute.status),
            amount: 0,
            expert: 'N/A',
        };

        try {
            if (dispute.type === 'consultation') {
                const session = await this.chatService.getSession(dispute.itemId);
                if (session) {
                    enriched.amount = session.totalCost || 0;
                    // We need expert name. Let's check session relations.
                    // If session doesn't have expert, we might need a better getSession in ChatService.
                    // For now let's hope it has it or we can add it.
                    enriched.expert = (session as any).expert?.user?.name || (session as any).expert?.displayName || 'N/A';
                }
            } else if (dispute.type === 'order') {
                // For orders, we can get totalAmount. 
                // Orders don't have a single expert usually, so we'll just set amount.
                const order = await this.orderService.getOrderById(dispute.itemId, dispute.userId);
                if (order) {
                    enriched.amount = order.totalAmount || 0;
                }
            }
        } catch (error) {
            console.error(`Error enriching dispute ${dispute.id}:`, error);
        }

        return enriched;
    }

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
