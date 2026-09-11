import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertAuthModule } from '../auth/auth.module';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ExpertAccountController } from './controllers/account.controller';
import { ExpertAccountFacade } from './account.facade';
import { ExpertAccount } from './entities/account.entity';
import { ExpertAccountPuja } from './entities/account-puja.entity';
import { Specialization } from './entities/specialization.entity';
import { ExpertSpecialization } from './entities/expert-specialization.entity';
import { ExpertPricing } from './entities/expert-pricing.entity';
import { ExpertAccountPujasUseCase } from './use-cases/account-pujas.usecase';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';
import { GetExpertAccountUseCase } from './use-cases/get-account.usecase';
import { UpdateExpertAccountUseCase } from './use-cases/update-account.usecase';
import { QueryExpertAccountsUseCase } from './use-cases/query-accounts.usecase';
import { UpdateExpertAccountStatusUseCase } from './use-cases/update-account-status.usecase';
import { SpecializationController } from './controllers/specialization.controller';
import { GetSpecializationsUseCase } from './use-cases/get-specializations.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExpertAccount,
      ExpertAccountPuja,
      Specialization,
      ExpertSpecialization,
      ExpertPricing,
      User,
    ]),
    ExpertAuthModule,
    CloudinaryModule,
  ],
  controllers: [ExpertAccountController, SpecializationController],
  providers: [
    ExpertAccountFacade,
    GetExpertAccountUseCase,
    UpdateExpertAccountUseCase,
    QueryExpertAccountsUseCase,
    UpdateExpertAccountStatusUseCase,
    ExpertAccountPujasUseCase,
    GetSpecializationsUseCase,
  ],
  exports: [ExpertAccountFacade, GetSpecializationsUseCase, TypeOrmModule],
})
export class ExpertAccountModule {}
