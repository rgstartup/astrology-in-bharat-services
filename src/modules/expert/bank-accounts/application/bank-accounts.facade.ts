import { Injectable } from '@nestjs/common';
import { CreateBankAccountUseCase } from './use-cases/create-bank-account.usecase';
import { ListBankAccountsUseCase } from './use-cases/list-bank-accounts.usecase';
import { GetBankAccountUseCase } from './use-cases/get-bank-account.usecase';
import { UpdateBankAccountUseCase } from './use-cases/update-bank-account.usecase';
import { SetPrimaryBankAccountUseCase } from './use-cases/set-primary-bank-account.usecase';
import { RemoveBankAccountUseCase } from './use-cases/remove-bank-account.usecase';
import { CreateBankAccountDto, UpdateBankAccountDto } from '../api/dto/bank-account.dto';

@Injectable()
export class BankAccountsFacade {
  constructor(
    private readonly createBankAccountUseCase: CreateBankAccountUseCase,
    private readonly listBankAccountsUseCase: ListBankAccountsUseCase,
    private readonly getBankAccountUseCase: GetBankAccountUseCase,
    private readonly updateBankAccountUseCase: UpdateBankAccountUseCase,
    private readonly setPrimaryBankAccountUseCase: SetPrimaryBankAccountUseCase,
    private readonly removeBankAccountUseCase: RemoveBankAccountUseCase,
  ) {}

  async create(userId: string, dto: CreateBankAccountDto) {
    return this.createBankAccountUseCase.execute(userId, dto);
  }

  async findAll(userId: string) {
    return this.listBankAccountsUseCase.execute(userId);
  }

  async findOne(userId: string, id: string) {
    return this.getBankAccountUseCase.execute(userId, id);
  }

  async update(userId: string, id: string, dto: UpdateBankAccountDto) {
    return this.updateBankAccountUseCase.execute(userId, id, dto);
  }

  async setPrimary(userId: string, id: string) {
    return this.setPrimaryBankAccountUseCase.execute(userId, id);
  }

  async remove(userId: string, id: string) {
    return this.removeBankAccountUseCase.execute(userId, id);
  }
}
