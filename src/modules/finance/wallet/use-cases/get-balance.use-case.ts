import { Injectable } from '@nestjs/common';
import { GetWalletUseCase } from './get-wallet.use-case';
import { WalletKey } from '../entities/wallet.entity';

@Injectable()
export class GetBalanceUseCase {
  constructor(private readonly getWalletUseCase: GetWalletUseCase) {}

  async execute(profileId: string | number, walletKey: WalletKey): Promise<number> {
    const wallet = await this.getWalletUseCase.execute(profileId, walletKey);
    return wallet.balance;
  }
}
