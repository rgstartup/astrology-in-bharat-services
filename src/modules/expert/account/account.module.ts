import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertAuthModule } from '../auth/auth.module';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ExpertAccountController } from './controllers/account.controller';
import { ExpertAccountFacade } from './account.facade';
import { ExpertAccount } from './entities/account.entity';
import { GetExpertAccountUseCase } from './use-cases/get-account.usecase';
import { UpdateExpertAccountUseCase } from './use-cases/update-account.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([ExpertAccount, User]), ExpertAuthModule],
  controllers: [ExpertAccountController],
  providers: [
    ExpertAccountFacade,
    GetExpertAccountUseCase,
    UpdateExpertAccountUseCase,
  ],
  exports: [ExpertAccountFacade, TypeOrmModule],
})
export class ExpertAccountModule {}
