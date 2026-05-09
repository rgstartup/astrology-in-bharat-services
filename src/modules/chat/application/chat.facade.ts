import { Injectable } from '@nestjs/common';
import { InitiateChatUseCase } from './use-cases/initiate-chat.use-case';
import { ActivateSessionUseCase } from './use-cases/activate-session.use-case';
import { EndChatUseCase } from './use-cases/end-chat.use-case';
import { ExpireSessionUseCase } from './use-cases/expire-session.use-case';
import { GetSessionUseCase } from './use-cases/get-session.use-case';
import { GetMessagesUseCase } from './use-cases/get-messages.use-case';
import { SaveMessageUseCase } from './use-cases/save-message.use-case';
import { ConvertToPaidUseCase } from './use-cases/convert-to-paid.use-case';
import { FindExpertSessionsUseCase, ExpertSessionFilter, FindExpertSessionsOptions } from './use-cases/find-expert-sessions.use-case';
import { FindClientSessionsUseCase } from './use-cases/find-client-sessions.use-case';
import { FindActiveClientSessionUseCase } from './use-cases/find-active-client-session.use-case';
import { GetTotalSessionsCountUseCase } from './use-cases/get-total-sessions-count.use-case';
import { CountExpertSessionsUseCase } from './use-cases/count-expert-sessions.use-case';
import { FindAllSessionsUseCase } from './use-cases/find-all-sessions.use-case';
import { AdminTerminateSessionUseCase } from './use-cases/admin-terminate-session.use-case';
import { GetChatSessionStatsUseCase } from './use-cases/get-chat-session-stats.use-case';
import { RejectChatUseCase } from './use-cases/reject-chat.use-case';
import { UpdateSessionMetadataUseCase } from './use-cases/update-session-metadata.use-case';
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
    ) { }

    async initiateChat(userId: number, expertId: number, metadata?: any) {
        return this.initiateChatUseCase.execute(userId, expertId, metadata);
    }

    async activateSession(sessionId: number) {
        return this.activateSessionUseCase.execute(sessionId);
    }

    async endChat(sessionId: number) {
        return this.endChatUseCase.execute(sessionId);
    }

    async expireSession(sessionId: number) {
        return this.expireSessionUseCase.execute(sessionId);
    }

    async getSession(id: number) {
        return this.getSessionUseCase.execute(id);
    }

    async getHistory(sessionId: number) {
        return this.getMessagesUseCase.execute(sessionId);
    }

    async saveMessage(
        sessionId: number,
        senderId: number,
        senderType: 'user' | 'expert',
        content: string,
        type?: MessageType,
    ) {
        return this.saveMessageUseCase.execute(sessionId, senderId, senderType, content, type);
    }

    async convertToPaid(sessionId: number) {
        return this.convertToPaidUseCase.execute(sessionId);
    }

    async getExpertSessions(userId: number, filter: ExpertSessionFilter, options: FindExpertSessionsOptions = {}) {
        return this.findExpertSessionsUseCase.execute(userId, filter, options);
    }

    async getClientSessions(userId: number) {
        return this.findClientSessionsUseCase.execute(userId);
    }

    async getActiveClientSession(userId: number) {
        return this.findActiveClientSessionUseCase.execute(userId);
    }

    async getTotalSessionsCount() {
        return this.getTotalSessionsCountUseCase.execute();
    }

    async getExpertSessionCount(expertId: number, options: { status?: ChatSessionStatus | ChatSessionStatus[], startDate?: Date } = {}) {
        return this.countExpertSessionsUseCase.execute(expertId, options);
    }

    async findAllSessions(filter?: string, page?: number, limit?: number) {
        return this.findAllSessionsUseCase.execute(filter, page, limit);
    }


    async adminTerminateSession(sessionId: number, adminId: number, userMessage?: string, expertMessage?: string) {
        return this.adminTerminateSessionUseCase.execute(sessionId, adminId, userMessage, expertMessage);
    }

    async getSessionStats() {
        return this.getChatSessionStatsUseCase.execute();
    }

    async rejectSession(sessionId: number) {
        return this.rejectChatUseCase.execute(sessionId);
    }

    async updateSessionMetadata(sessionId: number, metadata: any) {
        return this.updateSessionMetadataUseCase.execute(sessionId, metadata);
    }
}
