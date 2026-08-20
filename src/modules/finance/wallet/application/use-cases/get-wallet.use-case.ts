import { Injectable } from '@nestjs/common';
import WalletRepository from '../../infrastructure/repositories/wallet.repository';
import { Wallet, WalletKey } from '../../infrastructure/entities/wallet.entity';

@Injectable()
export class GetWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(profileId: string, walletKey: WalletKey): Promise<Wallet> {
    return this.walletRepository.getOrCreateWallet(profileId, walletKey);
  }
}
