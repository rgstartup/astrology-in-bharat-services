import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credential } from '@/modules/auth/domain/entities/credential.entity';
import { ICredentialRepository } from '../../domain/repositories/credential.repository.interface';

@Injectable()
export class TypeOrmCredentialRepository implements ICredentialRepository {
    constructor(
        @InjectRepository(Credential)
        private readonly repository: Repository<Credential>,
    ) { }

    async findOne(id: number): Promise<Credential | null> {
        return this.repository.findOne({ where: { id } });
    }

    async find(options: any): Promise<Credential[]> {
        return this.repository.find(options);
    }

    async save(credential: Credential): Promise<Credential> {
        return this.repository.save(credential);
    }

    create(data: Partial<Credential>): Credential {
        return this.repository.create(data);
    }

    async update(criteria: any, data: Partial<Credential>): Promise<void> {
        await this.repository.update(criteria, data);
    }

    async delete(id: number): Promise<void> {
        await this.repository.delete(id);
    }
}
