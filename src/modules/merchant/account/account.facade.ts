import { Injectable } from '@nestjs/common';
import { IMerchant } from '@/common/types/access-token.payload';
import { UpdateMerchantAccountDto } from './dto/request/account.dto';
import { QueryMerchantDto } from './dto/request/query-merchant.dto';
import { GetMerchantAccountUseCase } from './use-cases/get-account.usecase';
import { UpdateMerchantAccountUseCase } from './use-cases/update-account.usecase';
import { UpdateMerchantStatusUseCase } from './use-cases/update-status.usecase';
import { QueryMerchantAccountsUseCase } from './use-cases/query-accounts.usecase';
import { MerchantStatus } from './entities/account.entity';

@Injectable()
export class MerchantAccountFacade {
  constructor(
    private readonly getAccountUseCase: GetMerchantAccountUseCase,
    private readonly updateAccountUseCase: UpdateMerchantAccountUseCase,
    private readonly updateStatusUseCase: UpdateMerchantStatusUseCase,
    private readonly queryAccountsUseCase: QueryMerchantAccountsUseCase,
  ) {}

  getAccount(merchant: IMerchant) {
    return this.getAccountUseCase.execute(merchant);
  }

  updateAccount(merchant: IMerchant, dto: UpdateMerchantAccountDto) {
    return this.updateAccountUseCase.execute(merchant, dto);
  }

  updateStatus(merchant: IMerchant, isOnline: boolean) {
    return this.updateStatusUseCase.execute(merchant, isOnline);
  }

  updateVerification(id: number, status: MerchantStatus, isVerified?: boolean) {
    return this.updateStatusUseCase.updateVerification(id, status, isVerified);
  }

  listAccounts(query: QueryMerchantDto) {
    return this.queryAccountsUseCase.list(query);
  }

  getById(id: number) {
    return this.queryAccountsUseCase.byId(id);
  }

  getAccountById(id: number) {
    return this.queryAccountsUseCase.findEntityById(id);
  }

  getProfileById(id: number) {
    return this.queryAccountsUseCase.findEntityById(id);
  }

  getByUserId(userId: number) {
    return this.queryAccountsUseCase.byUserId(userId);
  }

  getProfileByUserId(userId: number) {
    return this.queryAccountsUseCase.byUserId(userId);
  }

  getRawAccounts() {
    return this.queryAccountsUseCase.getRaw();
  }
}

