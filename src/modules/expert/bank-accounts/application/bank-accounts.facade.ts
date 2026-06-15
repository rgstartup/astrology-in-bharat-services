import { Injectable } from '@nestjs/common';
import { CreateBankAccountUseCase } from './use-cases/create-bank-account.usecase';
import { ListBankAccountsUseCase } from './use-cases/list-bank-accounts.usecase';
import { GetBankAccountUseCase } from './use-cases/get-bank-account.usecase';
import { UpdateBankAccountUseCase } from './use-cases/update-bank-account.usecase';
import { SetPrimaryBankAccountUseCase } from './use-cases/set-primary-bank-account.usecase';
import { RemoveBankAccountUseCase } from './use-cases/remove-bank-account.usecase';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from '../api/dto/bank-account.dto';

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

  async create(expertProfileId: string, dto: CreateBankAccountDto) {
    return this.createBankAccountUseCase.execute(expertProfileId, dto);
  }

  async findAll(expertProfileId: string) {
    return this.listBankAccountsUseCase.execute(expertProfileId);
  }

  async findOne(expertProfileId: string, id: string) {
    return this.getBankAccountUseCase.execute(expertProfileId, id);
  }

  async update(expertProfileId: string, id: string, dto: UpdateBankAccountDto) {
    return this.updateBankAccountUseCase.execute(expertProfileId, id, dto);
  }

  async setPrimary(expertProfileId: string, id: string) {
    return this.setPrimaryBankAccountUseCase.execute(expertProfileId, id);
  }

  async remove(expertProfileId: string, id: string) {
    return this.removeBankAccountUseCase.execute(expertProfileId, id);
  }
}
