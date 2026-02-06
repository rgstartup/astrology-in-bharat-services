import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthAccount } from '@/modules/auth/domain/entities/oauth-accounts.entity';
import { IOAuthAccountRepository } from '../../domain/repositories/oauth-account.repository.interface';

@Injectable()
export class TypeOrmOAuthAccountRepository implements IOAuthAccountRepository {
    constructor(
        @InjectRepository(OAuthAccount)
        private readonly repository: Repository<OAuthAccount>,
    ) { }

    async findOne(options: any): Promise<OAuthAccount | null> {
        return this.repository.findOne(options);
    }

    async save(account: OAuthAccount): Promise<OAuthAccount> {
        return this.repository.save(account);
    }

    create(data: Partial<OAuthAccount>): OAuthAccount {
        return this.repository.create(data);
    }
}
