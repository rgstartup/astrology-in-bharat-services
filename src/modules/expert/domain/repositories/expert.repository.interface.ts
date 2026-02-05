import { ProfileExpert } from '../entities/profile-expert.entity';
import { User } from '@/modules/users';

export interface IExpertRepository {
    findByUserId(userId: number): Promise<ProfileExpert | null>;
    findById(id: number): Promise<ProfileExpert | null>;
    save(profile: ProfileExpert): Promise<ProfileExpert>;
    create(data: Partial<ProfileExpert>): ProfileExpert;
    findTopRated(limit: number): Promise<ProfileExpert[]>;
    listExperts(query: any): Promise<[ProfileExpert[], number]>;
    getExpertDetails(id: number): Promise<ProfileExpert | null>;
}

export const IExpertRepository = Symbol('IExpertRepository');

