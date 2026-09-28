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
import { ProfessionService } from './profession.service';
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
    ProfessionService,
    GetProfessionsUseCase,
    GetExpertProfessionsUseCase,
    SyncExpertProfessionsUseCase,
  ],
  exports: [ProfessionService, TypeOrmModule],
})
export class ProfessionModule {}
