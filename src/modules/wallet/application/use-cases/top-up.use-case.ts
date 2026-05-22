import { Injectable } from '@nestjs/common';
import { CreditUseCase } from './credit.use-case';
import { TransactionPurpose } from '../../infrastructure/entities/transaction.entity';
import { Wallet } from '../../infrastructure/entities/wallet.entity';

@Injectable()
export class TopUpUseCase {
  constructor(private readonly creditUseCase: CreditUseCase) {}

  async execute(
    userId: string,
    amount: number,
    paymentMethodId: string,
    referenceId?: string,
    externalQueryRunner?: any,
  ): Promise<Wallet> {
    return this.creditUseCase.execute(
      userId,
      amount,
      TransactionPurpose.RECHARGE,
      referenceId,
      externalQueryRunner,
    );
  }
}
