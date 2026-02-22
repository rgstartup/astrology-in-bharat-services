import { Injectable } from '@nestjs/common';
import { GetWalletUseCase } from './get-wallet.use-case';

@Injectable()
export class GetBalanceUseCase {
  constructor(private readonly getWalletUseCase: GetWalletUseCase) {}

  async execute(userId: number): Promise<number> {
    const wallet = await this.getWalletUseCase.execute(userId);
    return Number(wallet.balance);
  }
}
