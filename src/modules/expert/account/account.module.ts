import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertAuthModule } from '../auth/auth.module';
import { User } from '@/modules/users/entities/user.entity';
import { ExpertAccountController } from './controllers/account.controller';
import { ExpertAccountFacade } from './account.facade';
import { ExpertAccount } from './entities/account.entity';
import { ExpertAccountPuja } from './entities/account-puja.entity';
import { ExpertSpecialization } from './entities/expert-specialization.entity';
import { ExpertProfession } from '../profession/entities/expert-profession.entity';
import { ExpertAstrologyService } from './entities/expert-astrology-service.entity';
import { ExpertConsultationPricing } from './entities/expert-consultation-pricing.entity';
import { ExpertAccountPujasUseCase } from './use-cases/account-pujas.usecase';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';
import { GetExpertAccountUseCase } from './use-cases/get-account.usecase';
import { UpdateExpertAccountUseCase } from './use-cases/update-account.usecase';
import { QueryExpertAccountsUseCase } from './use-cases/query-accounts.usecase';
import { UpdateExpertAccountStatusUseCase } from './use-cases/update-account-status.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExpertAccount,
      ExpertAccountPuja,
      ExpertSpecialization,
      ExpertProfession,
      ExpertAstrologyService,
      ExpertConsultationPricing,
      User,
    ]),
    ExpertAuthModule,
    CloudinaryModule,
  ],
  controllers: [ExpertAccountController],
  providers: [
    ExpertAccountFacade,
    GetExpertAccountUseCase,
    UpdateExpertAccountUseCase,
    QueryExpertAccountsUseCase,
    UpdateExpertAccountStatusUseCase,
    ExpertAccountPujasUseCase,
  ],
  exports: [ExpertAccountFacade, TypeOrmModule],
})
export class ExpertAccountModule {}
