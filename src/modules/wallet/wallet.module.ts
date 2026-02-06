import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { WalletService } from './application/services/wallet.service';
import { Transaction } from './domain/entities/transaction.entity';
import { Wallet } from './domain/entities/wallet.entity';
import { Withdrawal } from './domain/entities/withdrawal.entity';
import { ITransactionRepository } from './domain/repositories/transaction.repository.interface';
import { IWalletRepository } from './domain/repositories/wallet.repository.interface';
import { IWithdrawalRepository } from './domain/repositories/withdrawal.repository.interface';
import { TypeOrmTransactionRepository } from './infrastructure/persistence/typeorm-transaction.repository';
import { TypeOrmWalletRepository } from './infrastructure/persistence/typeorm-wallet.repository';
import { TypeOrmWithdrawalRepository } from './infrastructure/persistence/typeorm-withdrawal.repository';
import { WalletController } from './interfaces/controllers/wallet.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction, Withdrawal]),
    NotificationModule,
  ],
  providers: [
    WalletService,
    {
      provide: IWalletRepository,
      useClass: TypeOrmWalletRepository,
    },
    {
      provide: ITransactionRepository,
      useClass: TypeOrmTransactionRepository,
    },
    {
      provide: IWithdrawalRepository,
      useClass: TypeOrmWithdrawalRepository,
    },
  ],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule { }
