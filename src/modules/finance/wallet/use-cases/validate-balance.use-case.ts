import { Injectable } from '@nestjs/common';
import { WalletKey } from '../entities/wallet.entity';
import WalletRepository from '../repositories/wallet.repository';

@Injectable()
export class ValidateBalanceUseCase {
  constructor(private readonly walletRepo: WalletRepository) {}

  async execute(
    profileId: string,
    walletKey: WalletKey,
    minAmount: number,
  ): Promise<boolean> {
    const wallet = await this.walletRepo.getOrCreateWallet(
      profileId,
      walletKey,
    );

    const balance = Number(wallet.balance);
    return balance >= minAmount;
  }
}
