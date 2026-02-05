import { OAuthAccount } from '../entities/oauth-accounts.entity';

export interface IOAuthAccountRepository {
    findOne(options: any): Promise<OAuthAccount | null>;
    save(account: OAuthAccount): Promise<OAuthAccount>;
    create(data: Partial<OAuthAccount>): OAuthAccount;
}

export const IOAuthAccountRepository = Symbol('IOAuthAccountRepository');
