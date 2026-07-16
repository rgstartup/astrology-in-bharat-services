import { Injectable } from '@nestjs/common';
import { GetBalanceUseCase } from './get-balance.use-case';
import { WalletKey } from '../../infrastructure/entities/wallet.entity';

@Injectable()
export class ValidateBalanceUseCase {
  constructor(private readonly getBalanceUseCase: GetBalanceUseCase) {}

  async execute(
    profileId: string,
    walletKey: WalletKey,
    minAmount: number,
  ): Promise<boolean> {
    const balance = await this.getBalanceUseCase.execute(profileId, walletKey);
    return balance >= minAmount;
  }
}
