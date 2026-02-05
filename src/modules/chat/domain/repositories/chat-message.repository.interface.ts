import { ChatMessage } from '../entities/chat-message.entity';

export interface IChatMessageRepository {
    find(options: any): Promise<ChatMessage[]>;
    save(message: ChatMessage): Promise<ChatMessage>;
    create(data: Partial<ChatMessage>): ChatMessage;
}

export const IChatMessageRepository = Symbol('IChatMessageRepository');
