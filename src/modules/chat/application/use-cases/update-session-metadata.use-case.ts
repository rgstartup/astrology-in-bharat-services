import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../../infrastructure/entities/chat-session.entity';

@Injectable()
export class UpdateSessionMetadataUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
    ) { }

    async execute(sessionId: number, metadata: any): Promise<ChatSession> {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) throw new NotFoundException('Session not found');

        session.metadata = metadata;
        return this.sessionRepo.save(session);
    }
}
