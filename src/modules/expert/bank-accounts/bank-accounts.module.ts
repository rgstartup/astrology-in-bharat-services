import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountsService } from './bank-accounts.service';
import { BankAccountsController } from './bank-accounts.controller';
import { BankAccount } from './entities/bank-account.entity';
import { ProfileExpert } from '../profile/entities/profile-expert.entity';

@Module({
    imports: [TypeOrmModule.forFeature([BankAccount, ProfileExpert])],
    controllers: [BankAccountsController],
    providers: [BankAccountsService],
    exports: [BankAccountsService],
})
export class BankAccountsModule { }
