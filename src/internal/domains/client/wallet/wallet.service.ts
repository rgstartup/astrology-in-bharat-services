import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { GetClientWalletUseCase } from './use-cases/get-client-wallet.use-case';
import { GetClientBalanceUseCase } from './use-cases/get-client-balance.use-case';
import { ValidateClientBalanceUseCase } from './use-cases/validate-client-balance.use-case';
import { RechargeWalletUseCase } from './use-cases/recharge-wallet.use-case';
import { DebitClientWalletUseCase } from './use-cases/debit-client-wallet.use-case';
import { ReserveClientBalanceUseCase } from './use-cases/reserve-client-balance.use-case';
import { DeductFromClientReservedUseCase } from './use-cases/deduct-from-client-reserved.use-case';
import { ReleaseClientReservedUseCase } from './use-cases/release-client-reserved.use-case';
import { GetClientTransactionsUseCase } from './use-cases/get-client-transactions.use-case';
import { InitiateWalletRechargeUseCase } from './use-cases/initiate-wallet-recharge.use-case';
import { VerifyWalletRechargeUseCase } from './use-cases/verify-wallet-recharge.use-case';
import { GetClientTransactionsDto } from './dto/get-client-transactions.dto';
import { InitiateRechargeDto } from './dto/initiate-recharge.dto';
import { VerifyRechargeDto } from './dto/verify-recharge.dto';
import { ClientAccount } from '../account/entities/account.entity';
import { ClientTransactionPurpose } from './enum';
import { ClientWallet } from './entities/client-wallet.entity';

@Injectable()
export class ClientWalletService {
  constructor(
    private readonly getClientWalletUseCase: GetClientWalletUseCase,
    private readonly getClientBalanceUseCase: GetClientBalanceUseCase,
    private readonly validateClientBalanceUseCase: ValidateClientBalanceUseCase,
    private readonly rechargeWalletUseCase: RechargeWalletUseCase,
    private readonly debitClientWalletUseCase: DebitClientWalletUseCase,
    private readonly reserveClientBalanceUseCase: ReserveClientBalanceUseCase,
    private readonly deductFromClientReservedUseCase: DeductFromClientReservedUseCase,
    private readonly releaseClientReservedUseCase: ReleaseClientReservedUseCase,
    private readonly getClientTransactionsUseCase: GetClientTransactionsUseCase,
    private readonly initiateWalletRechargeUseCase: InitiateWalletRechargeUseCase,
    private readonly verifyWalletRechargeUseCase: VerifyWalletRechargeUseCase,
  ) {}

  async getWallet(clientId: number): Promise<ClientWallet> {
    return this.getClientWalletUseCase.execute(clientId);
  }

  async getBalance(clientId: number): Promise<number> {
    return this.getClientBalanceUseCase.execute(clientId);
  }

  async validateBalance(clientId: number, minAmount: number): Promise<boolean> {
    return this.validateClientBalanceUseCase.execute(clientId, minAmount);
  }

  async recharge(
    clientId: number,
    amount: number,
    qr: QueryRunner,
    referenceId?: string,
    referenceType?: string,
    metadata?: Record<string, any>,
  ): Promise<ClientWallet> {
    return this.rechargeWalletUseCase.execute(
      clientId,
      amount,
      qr,
      referenceId,
      referenceType,
      metadata,
    );
  }

  async debit(
    clientId: string | number,
    amount: number,
    purpose: ClientTransactionPurpose,
    referenceId?: string,
    externalQueryRunner?: QueryRunner,
    allowNegative: boolean = false,
    referenceType?: string,
    metadata?: Record<string, any>,
  ): Promise<ClientWallet> {
    return this.debitClientWalletUseCase.execute(
      Number(clientId),
      amount,
      purpose,
      referenceId,
      externalQueryRunner,
      allowNegative,
      referenceType,
      metadata,
    );
  }

  async reserveBalance(
    clientId: string | number,
    amount: number,
    referenceId: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<boolean> {
    return this.reserveClientBalanceUseCase.execute(
      Number(clientId),
      amount,
      referenceId,
      externalQueryRunner,
    );
  }

  async deductFromReserved(
    clientId: string | number,
    amount: number,
    referenceId: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<void> {
    return this.deductFromClientReservedUseCase.execute(
      Number(clientId),
      amount,
      referenceId,
      externalQueryRunner,
    );
  }

  async releaseReserved(
    clientId: string | number,
    amount: number,
    referenceId: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<void> {
    return this.releaseClientReservedUseCase.execute(
      Number(clientId),
      amount,
      referenceId,
      externalQueryRunner,
    );
  }

  async getTransactions(clientId: number, dto: GetClientTransactionsDto) {
    return this.getClientTransactionsUseCase.execute(clientId, dto);
  }

  async initiateRecharge(client: ClientAccount, dto: InitiateRechargeDto) {
    return this.initiateWalletRechargeUseCase.execute(client, dto);
  }

  async verifyRecharge(clientId: number, dto: VerifyRechargeDto) {
    return this.verifyWalletRechargeUseCase.execute(clientId, dto);
  }
}
