import { Injectable } from '@nestjs/common';
import { CreditUseCase } from './credit.use-case';
import { TransactionPurpose } from '../../infrastructure/persistence/entities/transaction.entity';
import { Wallet } from '../../infrastructure/persistence/entities/wallet.entity';

@Injectable()
export class TopUpUseCase {
  constructor(private readonly creditUseCase: CreditUseCase) {}

  async execute(
    userId: number,
    amount: number,
    referenceId?: string,
  ): Promise<Wallet> {
    return this.creditUseCase.execute(
      userId,
      amount,
      TransactionPurpose.RECHARGE,
      referenceId,
    );
  }
}
