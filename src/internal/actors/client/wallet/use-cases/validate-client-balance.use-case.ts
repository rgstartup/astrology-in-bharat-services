import { Injectable } from '@nestjs/common';
import { GetClientWalletUseCase } from './get-client-wallet.use-case';

@Injectable()
export class ValidateClientBalanceUseCase {
  constructor(
    private readonly getClientBalanceUseCase: GetClientWalletUseCase,
  ) {}

  async execute(
    clientId: string | number,
    minAmount: number,
  ): Promise<boolean> {
    const clientWallet = await this.getClientBalanceUseCase.execute(
      Number(clientId),
    );

    const availableBalance =
      clientWallet.balance - clientWallet.reserved_balance;

    return availableBalance >= minAmount;
  }
}
