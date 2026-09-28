import { Injectable } from '@nestjs/common';
import { GetClientBalanceUseCase } from './get-client-balance.use-case';

@Injectable()
export class ValidateClientBalanceUseCase {
  constructor(private readonly getClientBalanceUseCase: GetClientBalanceUseCase) {}

  async execute(
    clientId: string | number,
    minAmount: number,
  ): Promise<boolean> {
    const balance = await this.getClientBalanceUseCase.execute(
      Number(clientId),
    );
    return balance >= minAmount;
  }
}
