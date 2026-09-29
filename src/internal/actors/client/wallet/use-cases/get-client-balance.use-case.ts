import { Injectable } from '@nestjs/common';
import { GetClientWalletUseCase } from './get-client-wallet.use-case';

@Injectable()
export class GetClientBalanceUseCase {
  constructor(
    private readonly getClientWalletUseCase: GetClientWalletUseCase,
  ) {}

  async execute(clientId: number): Promise<number> {
    const wallet = await this.getClientWalletUseCase.execute(clientId);
    return wallet.balance;
  }
}
