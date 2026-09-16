import { Injectable } from '@nestjs/common';
import WalletRepository from '../repositories/wallet.repository';
import { Wallet, WalletKey } from '../entities/wallet.entity';

@Injectable()
export class GetWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(profileId: string | number, walletKey: WalletKey): Promise<Wallet> {
    return this.walletRepository.getOrCreateWallet(profileId, walletKey);
  }
}
