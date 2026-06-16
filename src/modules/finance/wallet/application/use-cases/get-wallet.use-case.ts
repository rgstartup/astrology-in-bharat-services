import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet, WalletKey } from '../../infrastructure/entities/wallet.entity';

@Injectable()
export class GetWalletUseCase {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  async execute(profileId: string, walletKey: WalletKey): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({
      where: { [walletKey]: profileId },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        [walletKey]: profileId,
        balance: 0,
        reserved_balance: 0,
      });
      await this.walletRepository.save(wallet);
    }

    return wallet;
  }
}
