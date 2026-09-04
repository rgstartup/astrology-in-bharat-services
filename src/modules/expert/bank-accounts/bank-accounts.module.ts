import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountsController } from './controllers/bank-accounts.controller';
import { BankAccount } from './entities/bank-account.entity';
import { ExpertAccount } from '../account/entities/account.entity';
import { ExpertAuthModule } from '../auth/auth.module';
import { BankAccountsFacade } from './bank-accounts.facade';
import { CreateBankAccountUseCase } from './use-cases/create-bank-account.usecase';
import { ListBankAccountsUseCase } from './use-cases/list-bank-accounts.usecase';
import { GetBankAccountUseCase } from './use-cases/get-bank-account.usecase';
import { UpdateBankAccountUseCase } from './use-cases/update-bank-account.usecase';
import { SetPrimaryBankAccountUseCase } from './use-cases/set-primary-bank-account.usecase';
import { RemoveBankAccountUseCase } from './use-cases/remove-bank-account.usecase';
import { BankAccountEventHandler } from './event-handlers/bank-account.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([BankAccount, ExpertAccount]),
    ExpertAuthModule,
  ],
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
