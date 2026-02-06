import { CreateUserDto } from '../../application/dtos/user.dto';
import { User } from '../entities/user.entity';

export interface IUserRepository {
    create(data: Partial<User>): User;
    save(user: User): Promise<User>;
    findOne(options: any): Promise<User | null>;
    findById(id: number, relations?: string[]): Promise<User | null>;
    findByEmail(email: string, relations?: string[]): Promise<User | null>;
    findByEmailWithPassword(email: string): Promise<User | null>;
    findAll(search?: string, page?: number, limit?: number): Promise<{ data: User[]; total: number }>;
    count(options?: any): Promise<number>;
    update(id: number, data: Partial<User>): Promise<void>;
    delete(id: number): Promise<void>;
    getUserExpertGrowthStats(days: number): Promise<any[]>;
    getExpertStats(today: Date): Promise<any>;
    findAllByRole(roleName: string, search?: string, page?: number, limit?: number): Promise<{ data: User[]; total: number }>;
    getRepo(queryRunner?: any): any;
}

export const IUserRepository = Symbol('IUserRepository');
