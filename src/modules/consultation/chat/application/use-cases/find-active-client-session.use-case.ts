import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/entities/chat-session.entity';

@Injectable()
export class FindActiveClientSessionUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
    ) { }

    async execute(userId: string) {
        return this.sessionRepo.findOne({
            where: [
                { client_id: userId as any, status: ChatSessionStatus.PENDING },
                { client_id: userId as any, status: ChatSessionStatus.ACTIVE },
            ],
            relations: ['expert', 'expert.user'],
            order: { created_at: 'DESC' },
        });
    }
}
