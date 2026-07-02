import { Injectable } from '@nestjs/common';
import { GetDisputesUseCase } from './use-cases/get-disputes.use-case';
import { CreateDisputeUseCase } from './use-cases/create-dispute.use-case';
import { GetDisputeByIdUseCase } from './use-cases/get-dispute-by-id.use-case';
import { SendDisputeMessageUseCase } from './use-cases/send-message.use-case';
import { GetDisputeMessagesUseCase } from './use-cases/get-messages.use-case';
import { MarkMessagesAsReadUseCase } from './use-cases/mark-as-read.use-case';
import { CreateDisputeDto } from '../api/dto/create-dispute.dto';
import { SendDisputeMessageDto } from '../api/dto/send-dispute-message.dto';
import { IUser } from '@/common/types/access-token.payload';
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
  ) {}

  async createDispute(user: IUser, dto: CreateDisputeDto) {
    return this.createDisputeUseCase.execute(user, dto);
  }

  async getDisputes(profileId: string) {
    return this.getDisputesUseCase.execute(profileId);
  }

  async getDisputeById(profileId: string, disputeId: string) {
    return this.getDisputeByIdUseCase.execute(profileId, disputeId);
  }

  async sendMessage(
    profileId: string,
    disputeId: string,
    dto: SendDisputeMessageDto,
  ) {
    return this.sendMessageUseCase.execute(profileId, disputeId, dto);
  }

  async getMessages(profileId: string, disputeId: string) {
    return this.getMessagesUseCase.execute(profileId, disputeId);
  }

  async markMessagesAsRead(profileId: string, disputeId: string) {
    return this.markMessagesAsReadUseCase.execute(profileId, disputeId);
  }

  // --- Admin Methods ---
  async getAllDisputes(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return this.getAllDisputesUseCase.execute(params);
  }

  async updateDisputeStatus(
    disputeId: string,
    data: { status: string; notes?: string },
  ) {
    return this.updateDisputeStatusUseCase.execute(disputeId, data);
  }

  async getDisputeByIdForAdmin(disputeId: string) {
    // Admin doesn't need userId filtering
    return this.getDisputeByIdUseCase.execute('0', disputeId, true);
  }

  async getAdminMessages(disputeId: string) {
    return this.getMessagesUseCase.execute('0', disputeId, true);
  }

  async sendAdminMessage(
    adminId: string,
    disputeId: string,
    data: { message: string },
  ) {
    return this.sendMessageUseCase.execute(adminId, disputeId, data, true);
  }
}
