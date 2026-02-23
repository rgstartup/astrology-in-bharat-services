import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

import { ProfileExpert } from './infrastructure/persistence/entities/profile-expert.entity';
import { Address } from '@/common/address/address.entity';
import { ProfileController } from './api/controllers/profile.controller';
import { ExpertGateway } from './api/gateways/expert.gateway';
import { NodemailerModule } from '@/external/nodemailer/nodemailer.module';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';

import { ProfileFacade } from './application/profile.facade';
import { GetProfileUseCase } from './application/use-cases/get-profile.usecase';
import { CreateProfileUseCase } from './application/use-cases/create-profile.usecase';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.usecase';
import { UpdateStatusUseCase } from './application/use-cases/update-status.usecase';
import { ListExpertsUseCase } from './application/use-cases/list-experts.usecase';
import { GetExpertByIdUseCase } from './application/use-cases/get-expert-by-id.usecase';
import { UpdateKycStatusUseCase } from './application/use-cases/update-kyc-status.usecase';
import { GetTopRatedExpertsUseCase } from './application/use-cases/get-top-rated-experts.usecase';
import { GetExpertByUserIdUseCase } from './application/use-cases/get-expert-by-user-id.usecase';
import { KycStatusChangedHandler } from './application/event-handlers/kyc-status-changed.handler';
import { ExpertStatusChangedHandler } from './application/event-handlers/expert-status-changed.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileExpert, User, Address]),
    NodemailerModule,
    CloudinaryModule,
  ],
  controllers: [ProfileController],
  providers: [
    ExpertGateway,
    ProfileFacade,
    GetProfileUseCase,
    CreateProfileUseCase,
    UpdateProfileUseCase,
    UpdateStatusUseCase,
    ListExpertsUseCase,
    GetExpertByIdUseCase,
    UpdateKycStatusUseCase,
    GetTopRatedExpertsUseCase,
    GetExpertByUserIdUseCase,
    KycStatusChangedHandler,
    ExpertStatusChangedHandler,
  ],
  exports: [ProfileFacade, ExpertGateway, GetExpertByIdUseCase, TypeOrmModule],
})
export class ProfileModule { }
