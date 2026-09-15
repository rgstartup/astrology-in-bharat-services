import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profession } from './entities/profession.entity';
import { ExpertProfession } from './entities/expert-profession.entity';
import { ExpertAccount } from '../account/entities/account.entity';
import { Specialization } from '../specialization/entities/specialization.entity';
import {
  ProfessionController,
  ExpertProfessionController,
} from './controllers/profession.controller';
import { ProfessionFacade } from './profession.facade';
import { GetProfessionsUseCase } from './use-cases/get-professions.usecase';
import { GetExpertProfessionsUseCase } from './use-cases/get-expert-professions.usecase';
import { SyncExpertProfessionsUseCase } from './use-cases/sync-expert-professions.usecase';
import { ExpertAuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Profession,
      ExpertProfession,
      ExpertAccount,
      Specialization,
    ]),
    ExpertAuthModule,
  ],
  controllers: [ProfessionController, ExpertProfessionController],
  providers: [
    ProfessionFacade,
    GetProfessionsUseCase,
    GetExpertProfessionsUseCase,
    SyncExpertProfessionsUseCase,
  ],
  exports: [ProfessionFacade, TypeOrmModule],
})
export class ProfessionModule {}
