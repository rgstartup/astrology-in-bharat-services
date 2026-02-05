import { ProfileClient } from '../entities/profile-client.entity';

export interface IClientRepository {
    findByUserId(userId: number): Promise<ProfileClient | null>;
    create(data: Partial<ProfileClient>): ProfileClient;
    save(profile: ProfileClient): Promise<ProfileClient>;
}

export const IClientRepository = Symbol('IClientRepository');
