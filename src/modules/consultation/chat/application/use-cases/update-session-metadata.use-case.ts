import { Injectable, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../../infrastructure/entities/chat-session.entity';

@Injectable()
export class UpdateSessionMetadataUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
    ) { }

    async execute(sessionId: string, metadata: any): Promise<BooleanMessage> {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId as any } });
        if (!session) throw new NotFoundException('Session not found');

        session.metadata = metadata;
        await this.sessionRepo.save(session);
        return new BooleanMessage();
    }
}
