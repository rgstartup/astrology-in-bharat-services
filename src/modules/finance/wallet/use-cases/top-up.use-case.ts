import { Injectable } from '@nestjs/common';
import { CreditUseCase } from './credit.use-case';
import { TransactionPurpose } from '../entities/transaction.entity';
import { Wallet, WalletKey } from '../entities/wallet.entity';

@Injectable()
export class TopUpUseCase {
  constructor(private readonly creditUseCase: CreditUseCase) {}

  async execute(
    profileId: number,
    walletKey: WalletKey,
    amount: number,
    referenceId?: string,
    externalQueryRunner?: import('typeorm').QueryRunner,
  ): Promise<Wallet> {
    return this.creditUseCase.execute(
      profileId,
      walletKey,
      amount,
      TransactionPurpose.RECHARGE,
      referenceId,
      externalQueryRunner,
    );
  }
}
