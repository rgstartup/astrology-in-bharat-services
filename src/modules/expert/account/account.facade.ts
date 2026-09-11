import { Injectable } from '@nestjs/common';
import { IExpert } from '@/common/types/access-token.payload';
import { UpdateExpertAccountDto } from './dto/request/account.dto';
import { GetExpertAccountUseCase } from './use-cases/get-account.usecase';
import { UpdateExpertAccountUseCase } from './use-cases/update-account.usecase';
import { QueryExpertAccountsUseCase } from './use-cases/query-accounts.usecase';
import { UpdateExpertAccountStatusUseCase } from './use-cases/update-account-status.usecase';
import { ExpertKycStatus } from '../shared/enums/kyc-status.enum';
import { ExpertAccountPujasUseCase } from './use-cases/account-pujas.usecase';
import { ExpertPujaDto } from '../profile/api/dto/expert-puja.dto';
import { QueryExpertDto } from './dto/request/query-expert.dto';

@Injectable()
export class ExpertAccountFacade {
  constructor(
    private readonly getAccountUseCase: GetExpertAccountUseCase,
    private readonly updateAccountUseCase: UpdateExpertAccountUseCase,
    // private readonly createAccountUseCase: CreateExpertAccountUseCase,
    private readonly queryAccountsUseCase: QueryExpertAccountsUseCase,
    private readonly updateStatusUseCase: UpdateExpertAccountStatusUseCase,
    private readonly pujasUseCase: ExpertAccountPujasUseCase,
  ) {}

  getAccount(expert: IExpert) {
    return this.getAccountUseCase.execute(expert);
  }

  updateAccount(expert: IExpert, dto: UpdateExpertAccountDto) {
    return this.updateAccountUseCase.execute(expert, dto);
  }

  // createAccount(expert: IExpert, dto: CreateExpertAccountDto) {
  //   return this.createAccountUseCase.execute(expert, dto);
  // }

  listAccounts(query: QueryExpertDto) {
    return this.queryAccountsUseCase.list(query);
  }

  getTopRated(limit = 3) {
    return this.queryAccountsUseCase.topRated(limit);
  }

  getById(id: string) {
    return this.queryAccountsUseCase.byId(id);
  }

  getByUserId(userId: string) {
    return this.queryAccountsUseCase.byUserId(userId);
  }

  updateStatus(expert: IExpert, isAvailable: boolean) {
    return this.updateStatusUseCase.execute(expert, isAvailable);
  }

  updateKycStatus(id: string, status: ExpertKycStatus, reason?: string) {
    return this.updateStatusUseCase.updateKyc(id, status, reason);
  }

  upsertPuja(expert: IExpert, dto: ExpertPujaDto, id?: string) {
    return this.pujasUseCase.upsert(expert, dto, id);
  }

  deletePuja(expert: IExpert, id: string) {
    return this.pujasUseCase.remove(expert, id);
  }

  listAllPujas() {
    return this.pujasUseCase.list();
  }

  getPujaById(id: string) {
    return this.pujasUseCase.byId(id);
  }

  updatePujaLikes(id: string, diff: number) {
    return this.pujasUseCase.updateLikes(id, diff);
  }
}
