import { Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export default class WalletRepository extends Repository<Wallet> {
  async getOrCreateWallet(
    profileId: string | number,
    walletKey: string,
  ): Promise<Wallet> {
    const numProfileId =
      typeof profileId === 'number'
        ? profileId
        : Number(profileId) || profileId;
    const existingWallet = await this.findOne({
      where: { [walletKey]: numProfileId } as any,
    });

    if (existingWallet) return existingWallet;

    const newWallet = this.create({
      [walletKey]: numProfileId,
      balance: 0,
      reserved_balance: 0,
    } as any);
    return this.save(newWallet) as any;
  }
}
