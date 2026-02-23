import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/persistence/entities/chat-session.entity';

@Injectable()
export class FindActiveClientSessionUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
    ) { }

    async execute(userId: number) {
        return this.sessionRepo.findOne({
            where: [
                { user_id: userId, status: ChatSessionStatus.PENDING },
                { user_id: userId, status: ChatSessionStatus.ACTIVE },
            ],
            relations: ['expert', 'expert.user'],
            order: { created_at: 'DESC' },
        });
    }
}
