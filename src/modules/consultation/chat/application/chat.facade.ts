import { Injectable } from '@nestjs/common';
import { InitiateChatUseCase } from './use-cases/initiate-chat.use-case';
import { ActivateSessionUseCase } from './use-cases/activate-session.use-case';
import { EndChatUseCase } from './use-cases/end-chat.use-case';
import { ExpireSessionUseCase } from './use-cases/expire-session.use-case';
import { GetSessionUseCase } from './use-cases/get-session.use-case';
import { GetMessagesUseCase } from './use-cases/get-messages.use-case';
import { SaveMessageUseCase } from './use-cases/save-message.use-case';
import { ConvertToPaidUseCase } from './use-cases/convert-to-paid.use-case';
import {
  FindExpertSessionsUseCase,
  ExpertSessionFilter,
  FindExpertSessionsOptions,
} from './use-cases/find-expert-sessions.use-case';
import { FindClientSessionsUseCase } from './use-cases/find-client-sessions.use-case';
import { FindActiveClientSessionUseCase } from './use-cases/find-active-client-session.use-case';
import { GetTotalSessionsCountUseCase } from './use-cases/get-total-sessions-count.use-case';
import { CountExpertSessionsUseCase } from './use-cases/count-expert-sessions.use-case';
import { FindAllSessionsUseCase } from './use-cases/find-all-sessions.use-case';
import { AdminTerminateSessionUseCase } from './use-cases/admin-terminate-session.use-case';
import { GetChatSessionStatsUseCase } from './use-cases/get-chat-session-stats.use-case';
import { RejectChatUseCase } from './use-cases/reject-chat.use-case';
import { UpdateSessionMetadataUseCase } from './use-cases/update-session-metadata.use-case';
import { GetChatEarningsUseCase } from './use-cases/get-chat-earnings.use-case';
import { GetExpertSessionsByDateUseCase } from './use-cases/get-expert-sessions-by-date.use-case';
import { MessageType } from '../infrastructure/entities/chat-message.entity';
import { ChatSessionStatus } from '../infrastructure/entities/chat-session.entity';

@Injectable()
export class ChatFacade {
  constructor(
    private readonly initiateChatUseCase: InitiateChatUseCase,
    private readonly activateSessionUseCase: ActivateSessionUseCase,
    private readonly endChatUseCase: EndChatUseCase,
    private readonly expireSessionUseCase: ExpireSessionUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly getMessagesUseCase: GetMessagesUseCase,
    private readonly saveMessageUseCase: SaveMessageUseCase,
    private readonly convertToPaidUseCase: ConvertToPaidUseCase,
    private readonly findExpertSessionsUseCase: FindExpertSessionsUseCase,
    private readonly findClientSessionsUseCase: FindClientSessionsUseCase,
    private readonly findActiveClientSessionUseCase: FindActiveClientSessionUseCase,
    private readonly getTotalSessionsCountUseCase: GetTotalSessionsCountUseCase,
    private readonly countExpertSessionsUseCase: CountExpertSessionsUseCase,
    private readonly findAllSessionsUseCase: FindAllSessionsUseCase,
    private readonly adminTerminateSessionUseCase: AdminTerminateSessionUseCase,
    private readonly getChatSessionStatsUseCase: GetChatSessionStatsUseCase,
    private readonly rejectChatUseCase: RejectChatUseCase,
    private readonly updateSessionMetadataUseCase: UpdateSessionMetadataUseCase,
    private readonly getChatEarningsUseCase: GetChatEarningsUseCase,
    private readonly getExpertSessionsByDateUseCase: GetExpertSessionsByDateUseCase,
  ) {}

  async initiateChat(
    userId: string,
    expert_id: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.initiateChatUseCase.execute(userId, expert_id, metadata);
  }

  async activateSession(sessionId: string) {
    return this.activateSessionUseCase.execute(sessionId);
  }

  async endChat(sessionId: string) {
    return this.endChatUseCase.execute(sessionId);
  }

  async expireSession(sessionId: string) {
    return this.expireSessionUseCase.execute(sessionId);
  }

  async getSession(id: string) {
    return this.getSessionUseCase.execute(id);
  }

  async getHistory(sessionId: string) {
    return this.getMessagesUseCase.execute(sessionId);
  }

  async saveMessage(
    sessionId: string,
    senderId: string,
    senderType: 'user' | 'expert',
    content: string,
    type?: MessageType,
    attachmentUrl?: string,
    attachmentType?: string,
  ) {
    return this.saveMessageUseCase.execute(
      sessionId,
      senderId,
      senderType,
      content,
      type,
      attachmentUrl,
      attachmentType,
    );
  }

  async convertToPaid(sessionId: string) {
    return this.convertToPaidUseCase.execute(sessionId);
  }

  async getExpertSessions(
    expertProfileId: string,
    filter: ExpertSessionFilter,
    options: FindExpertSessionsOptions = {},
  ) {
    return this.findExpertSessionsUseCase.execute(
      expertProfileId,
      filter,
      options,
    );
  }

  async getClientSessions(clientProfileId: string) {
    return this.findClientSessionsUseCase.execute(clientProfileId);
  }

  async getActiveClientSession(clientProfileId: string) {
    return this.findActiveClientSessionUseCase.execute(clientProfileId);
  }

  async getTotalSessionsCount() {
    return this.getTotalSessionsCountUseCase.execute();
  }

  async getExpertSessionCount(
    expert_id: string,
    options: {
      status?: ChatSessionStatus | ChatSessionStatus[];
      startDate?: Date;
    } = {},
  ) {
    return this.countExpertSessionsUseCase.execute(expert_id, options);
  }

  async findAllSessions(filter?: string, page?: number, limit?: number) {
    return this.findAllSessionsUseCase.execute(filter, page, limit);
  }

  async adminTerminateSession(
    sessionId: string,
    adminId: string,
    userMessage?: string,
    expertMessage?: string,
  ) {
    return this.adminTerminateSessionUseCase.execute(
      sessionId,
      adminId,
      userMessage,
      expertMessage,
    );
  }

  async getSessionStats() {
    return this.getChatSessionStatsUseCase.execute();
  }

  async rejectSession(sessionId: string) {
    return this.rejectChatUseCase.execute(sessionId);
  }

  async updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.updateSessionMetadataUseCase.execute(sessionId, metadata);
  }

  async getExpertRevenueAndCount(expertProfileId: string) {
    return this.countExpertSessionsUseCase.getRevenueAndCount(expertProfileId);
  }

  async getEarnings(dateLimit: Date) {
    return this.getChatEarningsUseCase.execute(dateLimit);
  }

  async getExpertSessionsByDate(
    expert_id: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.getExpertSessionsByDateUseCase.execute(
      expert_id,
      startDate,
      endDate,
    );
  }
}
