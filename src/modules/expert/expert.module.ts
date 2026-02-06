import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { ProfileExpert } from '@/modules/expert/domain/entities/profile-expert.entity';
import { BankAccount } from '@/modules/expert/domain/entities/bank-account.entity';
import { Todo } from '@/modules/expert/domain/entities/todo.entity';
import { Address } from '@/common/domain/entities/address.entity';
import { User } from '@/modules/users/domain/entities/user.entity';
import { ChatSession } from '@/modules/chat/domain/entities/chat-session.entity';
import { Wallet } from '@/modules/wallet/domain/entities/wallet.entity';
import { Transaction } from '@/modules/wallet/domain/entities/transaction.entity';

// Repositories
import { IExpertRepository } from './domain/repositories/expert.repository.interface';
import { TypeOrmExpertRepository } from './infrastructure/persistence/typeorm-expert.repository';
import { IBankAccountRepository } from './domain/repositories/bank-account.repository.interface';
import { TypeOrmBankAccountRepository } from './infrastructure/persistence/typeorm-bank-account.repository';
import { ITodoRepository } from './domain/repositories/todo.repository.interface';
import { TypeOrmTodoRepository } from './infrastructure/persistence/typeorm-todo.repository';

// Services
import { ProfileService } from './application/services/profile.service';
import { BankAccountsService } from './application/services/bank-accounts.service';
import { TodosService } from './application/services/todos.service';
import { ExpertDashboardService } from './application/services/expert-dashboard.service';
import { ExpertEarningsService } from './application/services/earnings.service';

// Controllers
import { ProfileController } from './interfaces/controllers/profile.controller';
import { BankAccountsController } from './interfaces/controllers/bank-accounts.controller';
import { TodosController } from './interfaces/controllers/todos.controller';
import { ExpertDashboardController } from './interfaces/controllers/expert-dashboard.controller';
import { ExpertWalletController } from './interfaces/controllers/expert-wallet.controller';

// Gateways
import { ExpertGateway } from './interfaces/gateways/expert.gateway';

// Other Modules
import { NotificationModule } from '@/modules/notification/notification.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { CloudinaryModule } from '@/common/infrastructure/storage/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProfileExpert,
      BankAccount,
      Todo,
      Address,
      User,
      ChatSession,
      Wallet,
      Transaction,
    ]),
    NotificationModule,
    WalletModule,
    CloudinaryModule,
  ],
  providers: [
    ProfileService,
    BankAccountsService,
    TodosService,
    ExpertDashboardService,
    ExpertEarningsService,
    ExpertGateway,
    { provide: IExpertRepository, useClass: TypeOrmExpertRepository },
    { provide: IBankAccountRepository, useClass: TypeOrmBankAccountRepository },
    { provide: ITodoRepository, useClass: TypeOrmTodoRepository },
  ],
  controllers: [
    ProfileController,
    BankAccountsController,
    TodosController,
    ExpertDashboardController,
    ExpertWalletController,
  ],
  exports: [ProfileService, ExpertGateway, IExpertRepository],
})
export class ExpertModule { }
