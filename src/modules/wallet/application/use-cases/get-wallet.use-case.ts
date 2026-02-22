import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../infrastructure/persistence/entities/wallet.entity';

@Injectable()
export class GetWalletUseCase {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  async execute(userId: number): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        balance: 0,
        reservedBalance: 0,
      });
      await this.walletRepository.save(wallet);
    }
    return wallet;
  }
}
