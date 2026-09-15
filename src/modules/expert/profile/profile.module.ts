import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@/modules/users/entities/user.entity';
import { forwardRef } from '@nestjs/common';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';
import { UsersModule } from '@/modules/users/users.module';
import { AccountModule } from '@/modules/client/account/account.module';

import { ProfileExpert } from './entities/profile-expert.entity';
import { Address } from '@/common/address/address.entity';
import { ProfileController } from './controllers/profile.controller';
import { ExpertGateway } from './gateways/expert.gateway';
import { NodemailerModule } from '@/external/nodemailer/nodemailer.module';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';
import { ConsultationModule } from '@/modules/consultation/consultation.module';

import { ExpertProfileFacade } from './profile.facade';
import { GetProfileUseCase } from './use-cases/get-profile.usecase';
import { CreateProfileUseCase } from './use-cases/create-profile.usecase';
import { UpdateProfileUseCase } from './use-cases/update-profile.usecase';
import { UpdateStatusUseCase } from './use-cases/update-status.usecase';
import { ListExpertsUseCase } from './use-cases/list-experts.usecase';
import { GetExpertByIdUseCase } from './use-cases/get-expert-by-id.usecase';
import { UpdateKycStatusUseCase } from './use-cases/update-kyc-status.usecase';
import { GetTopRatedExpertsUseCase } from './use-cases/get-top-rated-experts.usecase';
import { GetExpertByUserIdUseCase } from './use-cases/get-expert-by-user-id.usecase';
import { UpsertPujaUseCase } from './use-cases/puja/upsert-puja.usecase';
import { DeletePujaUseCase } from './use-cases/puja/delete-puja.usecase';
import { ListAllPujasUseCase } from './use-cases/puja/list-all-pujas.usecase';
import { GetPujaByIdUseCase } from './use-cases/puja/get-puja-by-id.usecase';
import { UpdatePujaLikesUseCase } from './use-cases/puja/update-puja-likes.usecase';
import { UpdateProfileWithQueryRunnerUseCase } from './use-cases/update-profile-with-query-runner.usecase';
import { GetExpertDetailUseCase } from './use-cases/get-admin-expert-detail.use-case';

import { ExpertPuja } from './entities/expert-puja.entity';
import { KycStatusChangedHandler } from './event-handlers/kyc-status-changed.handler';
import { ExpertStatusChangedHandler } from './event-handlers/expert-status-changed.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileExpert, User, Address, ExpertPuja]),
    NodemailerModule,
    CloudinaryModule,
    forwardRef(() => ConsultationModule),
    forwardRef(() => WalletModule),
    forwardRef(() => UsersModule),
    forwardRef(() => AccountModule),
  ],
  controllers: [ProfileController],
  providers: [
    ExpertGateway,
    ExpertProfileFacade,
    GetProfileUseCase,
    CreateProfileUseCase,
    UpdateProfileUseCase,
    UpdateStatusUseCase,
    ListExpertsUseCase,
    GetExpertByIdUseCase,
    UpdateKycStatusUseCase,
    GetTopRatedExpertsUseCase,
    GetExpertByUserIdUseCase,
    UpsertPujaUseCase,
    DeletePujaUseCase,
    GetExpertDetailUseCase,
    ListAllPujasUseCase,
    GetPujaByIdUseCase,
    UpdatePujaLikesUseCase,
    UpdateProfileWithQueryRunnerUseCase,

    KycStatusChangedHandler,
    ExpertStatusChangedHandler,
  ],
  exports: [
    ExpertProfileFacade,
    ExpertGateway,
    GetExpertByIdUseCase,
    TypeOrmModule,
  ],
})
export class ProfileModule {}
