import { Role } from '../entities/roles.entity';

export interface IRoleRepository {
    findByName(name: string): Promise<Role | null>;
    findByNames(names: string[]): Promise<Role[]>;
    create(data: Partial<Role>): Role;
    save(role: Role): Promise<Role>;
    findOne(options: any): Promise<Role | null>;
}

export const IRoleRepository = Symbol('IRoleRepository');
