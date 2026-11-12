import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecializationController } from './controllers/specialization.controller';
import { SpecializationService } from './specialization.service';
import { GetSpecializationsUseCase } from './use-cases/get-specializations.usecase';
import { SyncExpertSpecializationsUseCase } from './use-cases/sync-expert-specializations.usecase';
import { ExpertAuthModule } from '../auth/auth.module';
import { ExpertAccount } from '../account/entities/account.entity';
import { ExpertSpecialization } from '../account/entities/expert-specialization.entity';
import { Specialization } from './entities/specialization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Specialization,
      ExpertSpecialization,
      ExpertAccount,
    ]),
    ExpertAuthModule,
  ],
  controllers: [SpecializationController],
  providers: [
    SpecializationService,
    GetSpecializationsUseCase,
    SyncExpertSpecializationsUseCase,
  ],
  exports: [SpecializationService, GetSpecializationsUseCase],
})
export class SpecializationModule {}
