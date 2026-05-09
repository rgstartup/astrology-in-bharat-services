import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../infrastructure/entities/wallet.entity';

@Injectable()
export class GetWalletUseCase {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) { }

  async execute(userId: number): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = this.walletRepository.create({
        user_id: userId,
        balance: 0,
        reserved_balance: 0,
      });
      await this.walletRepository.save(wallet);
    }
    return wallet;
  }
}
