import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/persistence/entities/chat-session.entity';

@Injectable()
export class ActivateSessionUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
    ) { }

    async execute(sessionId: number) {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId },
        });
        if (!session) throw new NotFoundException('Session not found');

        if (session.status === ChatSessionStatus.ACTIVE) {
            return session; // Already active, no need to throw error
        }

        if (session.status !== ChatSessionStatus.PENDING) {
            throw new BadRequestException(
                `Cannot activate session with status: ${session.status}`,
            );
        }

        session.status = ChatSessionStatus.ACTIVE;
        session.startTime = new Date();
        return this.sessionRepo.save(session);
    }
}
