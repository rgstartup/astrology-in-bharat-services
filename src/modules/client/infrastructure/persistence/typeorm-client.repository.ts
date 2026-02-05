import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileClient } from '../../domain/entities/profile-client.entity';
import { IClientRepository } from '../../domain/repositories/client.repository.interface';

@Injectable()
export class TypeOrmClientRepository implements IClientRepository {
    constructor(
        @InjectRepository(ProfileClient)
        private readonly repository: Repository<ProfileClient>,
    ) { }

    async findByUserId(userId: number): Promise<ProfileClient | null> {
        return this.repository.findOne({
            where: { user: { id: userId } },
            relations: ['user'],
        });
    }

    create(data: Partial<ProfileClient>): ProfileClient {
        return this.repository.create(data);
    }

    async save(profile: ProfileClient): Promise<ProfileClient> {
        return this.repository.save(profile);
    }
}
