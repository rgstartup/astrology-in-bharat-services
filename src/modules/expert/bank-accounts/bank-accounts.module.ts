import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountsController } from './api/controllers/bank-accounts.controller';
import { BankAccount } from './infrastructure/entities/bank-account.entity';
import { ProfileExpert } from '../profile/infrastructure/entities/profile-expert.entity';
import { BankAccountsFacade } from './application/bank-accounts.facade';
import { CreateBankAccountUseCase } from './application/use-cases/create-bank-account.usecase';
import { ListBankAccountsUseCase } from './application/use-cases/list-bank-accounts.usecase';
import { GetBankAccountUseCase } from './application/use-cases/get-bank-account.usecase';
import { UpdateBankAccountUseCase } from './application/use-cases/update-bank-account.usecase';
import { SetPrimaryBankAccountUseCase } from './application/use-cases/set-primary-bank-account.usecase';
import { RemoveBankAccountUseCase } from './application/use-cases/remove-bank-account.usecase';
import { BankAccountEventHandler } from './application/event-handlers/bank-account.handler';

@Module({
  imports: [TypeOrmModule.forFeature([BankAccount, ProfileExpert])],
  controllers: [BankAccountsController],
  providers: [
    BankAccountsFacade,
    CreateBankAccountUseCase,
    ListBankAccountsUseCase,
    GetBankAccountUseCase,
    UpdateBankAccountUseCase,
    SetPrimaryBankAccountUseCase,
    RemoveBankAccountUseCase,
    BankAccountEventHandler,
  ],
  exports: [BankAccountsFacade],
})
export class BankAccountsModule {}
