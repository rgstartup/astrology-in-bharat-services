import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsedTokens } from '@/modules/auth/domain/entities/used-tokens.entity';
import { IUsedTokenRepository } from '../../domain/repositories/used-token.repository.interface';

@Injectable()
export class TypeOrmUsedTokenRepository implements IUsedTokenRepository {
    constructor(
        @InjectRepository(UsedTokens)
        private readonly repository: Repository<UsedTokens>,
    ) { }

    async findOne(options: any): Promise<UsedTokens | null> {
        return this.repository.findOne(options);
    }

    async save(token: UsedTokens): Promise<UsedTokens> {
        return this.repository.save(token);
    }

    create(data: Partial<UsedTokens>): UsedTokens {
        return this.repository.create(data);
    }
}
