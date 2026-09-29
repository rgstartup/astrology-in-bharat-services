import { Module } from '@nestjs/common';
import { SpecializationController } from './controllers/specialization.controller';
import { SpecializationService } from './specialization.service';
import { GetSpecializationsUseCase } from './use-cases/get-specializations.usecase';
import { ExpertAuthModule } from '../auth/auth.module';

@Module({
  imports: [ExpertAuthModule],
  controllers: [SpecializationController],
  providers: [SpecializationService, GetSpecializationsUseCase],
  exports: [SpecializationService, GetSpecializationsUseCase],
})
export class SpecializationModule {}
