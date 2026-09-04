import { Injectable } from '@nestjs/common';
import { IUser } from '@/common/types/access-token.payload';
import { UpdateExpertAccountDto } from './dto/account.dto';
import { GetExpertAccountUseCase } from './use-cases/get-account.usecase';
import { UpdateExpertAccountUseCase } from './use-cases/update-account.usecase';

@Injectable()
export class ExpertAccountFacade {
  constructor(
    private readonly getAccountUseCase: GetExpertAccountUseCase,
    private readonly updateAccountUseCase: UpdateExpertAccountUseCase,
  ) {}

  getAccount(user: IUser) {
    return this.getAccountUseCase.execute(user);
  }

  updateAccount(user: IUser, dto: UpdateExpertAccountDto) {
    return this.updateAccountUseCase.execute(user, dto);
  }
}
