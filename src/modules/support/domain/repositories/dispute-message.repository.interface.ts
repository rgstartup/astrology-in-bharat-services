import { DisputeMessage } from '../entities/dispute-message.entity';

export const IDisputeMessageRepository = Symbol('IDisputeMessageRepository');

export interface IDisputeMessageRepository {
    create(message: Partial<DisputeMessage>): DisputeMessage;
    save(message: DisputeMessage): Promise<DisputeMessage>;
    findByDisputeId(disputeId: number): Promise<DisputeMessage[]>;
    markAsRead(disputeId: number, userId: number): Promise<number>;
    getUnreadCount(disputeId: number, userId: number): Promise<number>;
}
