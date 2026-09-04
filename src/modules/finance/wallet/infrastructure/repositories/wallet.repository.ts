import { Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export default class WalletRepository extends Repository<Wallet> {
  async getOrCreateWallet(
    profileId: string,
    walletKey: string,
  ): Promise<Wallet> {
    const existingWallet = await this.findOne({
      where: { [walletKey]: profileId },
    });

    if (existingWallet) return existingWallet;

    const newWallet = this.create({
      [walletKey]: profileId,
      balance: 0,
      reserved_balance: 0,
    });
    return this.save(newWallet);
  }
}
