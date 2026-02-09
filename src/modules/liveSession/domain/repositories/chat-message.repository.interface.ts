import { LiveSessionMessage } from '../entities/chat-message.entity';

export interface IChatMessageRepository {
    create(data: Partial<LiveSessionMessage>): LiveSessionMessage;
    save(message: LiveSessionMessage): Promise<LiveSessionMessage>;
    findBySessionId(sessionId: number): Promise<LiveSessionMessage[]>;
}

export const IChatMessageRepository = Symbol('IChatMessageRepository');
