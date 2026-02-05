import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../domain/entities/wallet.entity';
import { IWalletRepository } from '../../domain/repositories/wallet.repository.interface';

@Injectable()
export class TypeOrmWalletRepository implements IWalletRepository {
    constructor(
        @InjectRepository(Wallet)
        private readonly repository: Repository<Wallet>,
    ) { }

    async findByUserId(userId: number): Promise<Wallet | null> {
        return this.repository.findOne({ where: { userId } });
    }

    async save(wallet: Wallet): Promise<Wallet> {
        return this.repository.save(wallet);
    }

    create(data: Partial<Wallet>): Wallet {
        return this.repository.create(data);
    }

    async findOneWithLock(userId: number): Promise<Wallet | null> {
        return this.repository.findOne({
            where: { userId },
            lock: { mode: 'pessimistic_write' },
        });
    }
}
