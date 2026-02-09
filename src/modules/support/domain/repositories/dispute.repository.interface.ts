import { Dispute } from '../entities/dispute.entity';

export const IDisputeRepository = Symbol('IDisputeRepository');

export interface IDisputeRepository {
    create(dispute: Partial<Dispute>): Dispute;
    save(dispute: Dispute): Promise<Dispute>;
    findById(id: number): Promise<Dispute | null>;
    findAll(filters?: any, page?: number, limit?: number): Promise<{ data: Dispute[]; total: number }>;
    update(id: number, data: Partial<Dispute>): Promise<void>;
    getStats(): Promise<any>;
}
