import { Injectable } from '@nestjs/common';
import { GetBalanceUseCase } from './get-balance.use-case';

@Injectable()
export class ValidateBalanceUseCase {
  constructor(private readonly getBalanceUseCase: GetBalanceUseCase) {}

  async execute(userId: number, minAmount: number): Promise<boolean> {
    const balance = await this.getBalanceUseCase.execute(userId);
    return balance >= minAmount;
  }
}
