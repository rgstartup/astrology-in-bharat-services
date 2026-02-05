import { UsedTokens } from '../entities/used-tokens.entity';

export interface IUsedTokenRepository {
    findOne(options: any): Promise<UsedTokens | null>;
    save(token: UsedTokens): Promise<UsedTokens>;
    create(data: Partial<UsedTokens>): UsedTokens;
}

export const IUsedTokenRepository = Symbol('IUsedTokenRepository');
