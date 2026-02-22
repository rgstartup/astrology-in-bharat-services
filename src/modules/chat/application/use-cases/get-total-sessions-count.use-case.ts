import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../../infrastructure/persistence/entities/chat-session.entity';

@Injectable()
export class GetTotalSessionsCountUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
    ) { }

    async execute() {
        return this.sessionRepo.count();
    }
}
