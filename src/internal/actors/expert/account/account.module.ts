import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertAuthModule } from '@/internal/actors/expert/auth/auth.module';
import { User } from '@/internal/users/entities/user.entity';
import { ExpertAccountController } from './controllers/account.controller';
import { AvatarController } from './controllers/avatar.controller';
import { ExpertAccountService } from './account.service';
import { ExpertAccount } from './entities/account.entity';
import { ExpertAccountPuja } from './entities/account-puja.entity';
import { ExpertSpecialization } from './entities/expert-specialization.entity';
import { ExpertProfession } from '@/internal/actors/expert/profession/entities/expert-profession.entity';
import { ExpertAstrologyService } from './entities/expert-astrology-service.entity';
import { ExpertConsultationPricing } from './entities/expert-consultation-pricing.entity';
import { ExpertAccountPujasUseCase } from './use-cases/account-pujas.usecase';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';
import { StorageModule } from '@/external/storage';
import { GetExpertAccountUseCase } from './use-cases/get-account.usecase';
import { PersistExpertAccountAvatarUseCase } from './use-cases/persist-expert-account-avatar.usecase';
import { UpdateExpertAccountAvatarUseCase } from './use-cases/update-account-avatar.usecase';
import { UpdateExpertAccountIntroVideoUseCase } from './use-cases/update-account-intro-video.usecase';
import { UpdateExpertAccountUseCase } from './use-cases/update-account.usecase';
import { UpdateExpertAccountStatusUseCase } from './use-cases/update-account-status.usecase';
import { PresenceModule } from '../presence/presence.module';

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
    StorageModule,
    PresenceModule,
  ],
  controllers: [ExpertAccountController, AvatarController],
  providers: [
    ExpertAccountService,
    GetExpertAccountUseCase,
    PersistExpertAccountAvatarUseCase,
    UpdateExpertAccountAvatarUseCase,
    UpdateExpertAccountIntroVideoUseCase,
    UpdateExpertAccountUseCase,
    UpdateExpertAccountStatusUseCase,
    ExpertAccountPujasUseCase,
  ],
  exports: [ExpertAccountService, TypeOrmModule],
})
export class ExpertAccountModule {}
