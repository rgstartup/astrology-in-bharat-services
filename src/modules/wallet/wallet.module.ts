import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './domain/entities/wallet.entity';
import { Transaction } from './domain/entities/transaction.entity';
import { Withdrawal } from './domain/entities/withdrawal.entity';
import { WalletService } from './application/services/wallet.service';
import { WalletController } from './interfaces/controllers/wallet.controller';
import { NotificationModule } from '../notification/notification.module';
import { IWalletRepository } from './domain/repositories/wallet.repository.interface';
import { ITransactionRepository } from './domain/repositories/transaction.repository.interface';
import { IWithdrawalRepository } from './domain/repositories/withdrawal.repository.interface';
import { TypeOrmWalletRepository } from './infrastructure/persistence/typeorm-wallet.repository';
import { TypeOrmTransactionRepository } from './infrastructure/persistence/typeorm-transaction.repository';
import { TypeOrmWithdrawalRepository } from './infrastructure/persistence/typeorm-withdrawal.repository';

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
