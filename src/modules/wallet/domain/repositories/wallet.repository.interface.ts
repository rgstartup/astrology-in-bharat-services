import { Wallet } from '../entities/wallet.entity';

export interface IWalletRepository {
    findByUserId(userId: number): Promise<Wallet | null>;
    save(wallet: Wallet): Promise<Wallet>;
    create(data: Partial<Wallet>): Wallet;
    findOneWithLock(userId: number): Promise<Wallet | null>;
}

export const IWalletRepository = Symbol('IWalletRepository');
