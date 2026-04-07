import { Injectable } from '@nestjs/common';
import { GetDisputesUseCase } from './use-cases/get-disputes.use-case';
import { CreateDisputeUseCase } from './use-cases/create-dispute.use-case';
import { GetDisputeByIdUseCase } from './use-cases/get-dispute-by-id.use-case';
import { SendDisputeMessageUseCase } from './use-cases/send-message.use-case';
import { GetDisputeMessagesUseCase } from './use-cases/get-messages.use-case';
import { MarkMessagesAsReadUseCase } from './use-cases/mark-as-read.use-case';
import { CreateDisputeDto } from '../api/dto/create-dispute.dto';
import { SendDisputeMessageDto } from '../api/dto/send-dispute-message.dto';
import { GetAllDisputesUseCase } from './use-cases/get-all-disputes.use-case';
import { UpdateDisputeStatusUseCase } from './use-cases/update-dispute-status.use-case';

@Injectable()
export class SupportFacade {
    constructor(
        private readonly getDisputesUseCase: GetDisputesUseCase,
        private readonly createDisputeUseCase: CreateDisputeUseCase,
        private readonly getDisputeByIdUseCase: GetDisputeByIdUseCase,
        private readonly sendMessageUseCase: SendDisputeMessageUseCase,
        private readonly getMessagesUseCase: GetDisputeMessagesUseCase,
        private readonly markMessagesAsReadUseCase: MarkMessagesAsReadUseCase,
        private readonly getAllDisputesUseCase: GetAllDisputesUseCase,
        private readonly updateDisputeStatusUseCase: UpdateDisputeStatusUseCase,
    ) { }

    async createDispute(userId: number, dto: CreateDisputeDto) {
        return this.createDisputeUseCase.execute(userId, dto);
    }

    async getDisputes(userId: number) {
        return this.getDisputesUseCase.execute(userId);
    }

    async getDisputeById(userId: number, disputeId: number) {
        return this.getDisputeByIdUseCase.execute(userId, disputeId);
    }

    async sendMessage(userId: number, disputeId: number, dto: SendDisputeMessageDto) {
        return this.sendMessageUseCase.execute(userId, disputeId, dto);
    }

    async getMessages(userId: number, disputeId: number) {
        return this.getMessagesUseCase.execute(userId, disputeId);
    }

    async markMessagesAsRead(userId: number, disputeId: number) {
        return this.markMessagesAsReadUseCase.execute(userId, disputeId);
    }

    // --- Admin Methods ---
    async getAllDisputes(params?: { status?: string, page?: number, limit?: number }) {
        return this.getAllDisputesUseCase.execute(params);
    }

    async updateDisputeStatus(disputeId: number, data: { status: string; notes?: string }) {
        return this.updateDisputeStatusUseCase.execute(disputeId, data);
    }

    async getDisputeByIdForAdmin(disputeId: number) {
        // Admin doesn't need userId filtering
        return this.getDisputeByIdUseCase.execute(0, disputeId, true); 
    }

    async getAdminMessages(disputeId: number) {
        return this.getMessagesUseCase.execute(0, disputeId, true);
    }

    async sendAdminMessage(adminId: number, disputeId: number, data: { message: string }) {
        return this.sendMessageUseCase.execute(adminId, disputeId, data, true);
    }
}
