import { ChatSession, ChatSessionStatus } from '../entities/chat-session.entity';

export interface IChatSessionRepository {
    findOne(options: any): Promise<ChatSession | null>;
    find(options: any): Promise<ChatSession[]>;
    save(session: ChatSession): Promise<ChatSession>;
    create(data: Partial<ChatSession>): ChatSession;
    count(options?: any): Promise<number>;
    findAllWithFilters(type?: string): Promise<any[]>;
}

export const IChatSessionRepository = Symbol('IChatSessionRepository');
