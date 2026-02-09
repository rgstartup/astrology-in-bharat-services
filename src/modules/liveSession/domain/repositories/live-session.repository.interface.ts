import { LiveSession } from '../entities/live-session.entity';

export interface ILiveSessionRepository {
    create(data: Partial<LiveSession>): LiveSession;
    save(session: LiveSession): Promise<LiveSession>;
    findById(id: number): Promise<LiveSession | null>;
    findAllActive(): Promise<LiveSession[]>;
    findAll(): Promise<LiveSession[]>;
    update(id: number, data: Partial<LiveSession>): Promise<void>;
}

export const ILiveSessionRepository = Symbol('ILiveSessionRepository');
