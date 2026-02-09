import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { ILiveSessionRepository } from '../../domain/repositories/live-session.repository.interface';
import { IChatMessageRepository } from '../../domain/repositories/chat-message.repository.interface';
import { LiveSessionStatus } from '../../domain/enums/session-status.enum';

@Injectable()
export class LiveSessionService {
    constructor(
        @Inject(ILiveSessionRepository)
        private readonly sessionRepo: ILiveSessionRepository,
        @Inject(IChatMessageRepository)
        private readonly messageRepo: IChatMessageRepository,
        private eventEmitter: EventEmitter2,
    ) { }

    async startSession(createSessionDto: CreateSessionDto) {
        const session = this.sessionRepo.create(createSessionDto);
        const savedSession = await this.sessionRepo.save(session);
        this.eventEmitter.emit('session.started', savedSession);
        return savedSession;
    }

    async endSession(sessionId: number) {
        await this.sessionRepo.update(sessionId, { status: LiveSessionStatus.ENDED, endedAt: new Date() });
        const session = await this.sessionRepo.findById(sessionId);
        if (session) {
            this.eventEmitter.emit('session.ended', session);
        }
        return session;
    }

    async addMessage(createMessageDto: CreateMessageDto) {
        const message = this.messageRepo.create(createMessageDto);
        const savedMessage = await this.messageRepo.save(message);
        this.eventEmitter.emit('chat.message', savedMessage);
        return savedMessage;
    }

    async getAllSessions() {
        return this.sessionRepo.findAll();
    }

    async getActiveSessions() {
        return this.sessionRepo.findAllActive();
    }

    async getSessionMessages(sessionId: number) {
        return this.messageRepo.findBySessionId(sessionId);
    }
}
