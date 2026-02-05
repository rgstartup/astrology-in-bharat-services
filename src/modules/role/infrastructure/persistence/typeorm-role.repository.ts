import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../../domain/entities/roles.entity';
import { IRoleRepository } from '../../domain/repositories/role.repository.interface';

@Injectable()
export class TypeOrmRoleRepository implements IRoleRepository {
    constructor(
        @InjectRepository(Role)
        private readonly repository: Repository<Role>,
    ) { }

    async findByName(name: string): Promise<Role | null> {
        return this.repository.findOne({ where: { name } });
    }

    async findByNames(names: string[]): Promise<Role[]> {
        return this.repository.findBy({ name: names.length ? In(names) : In([]) });
    }

    create(data: Partial<Role>): Role {
        return this.repository.create(data);
    }

    async save(role: Role): Promise<Role> {
        return this.repository.save(role);
    }

    async findOne(options: any): Promise<Role | null> {
        return this.repository.findOne(options);
    }
}
