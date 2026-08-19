import { Injectable } from '@nestjs/common';
import { GetBalanceUseCase } from './get-balance.use-case';
import { Wallet, WalletKey } from '../../infrastructure/entities/wallet.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ValidateBalanceUseCase {
  constructor(private readonly walletRepo: Repository<Wallet>) {}

  async execute(
    profileId: string,
    walletKey: WalletKey,
    minAmount: number,
  ): Promise<boolean> {
    const balance = await this.getBalanceUseCase.execute(profileId, walletKey);
    return balance >= minAmount;
  }
}
