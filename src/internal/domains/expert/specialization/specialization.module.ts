import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Specialization } from './entities/specialization.entity';
import { SpecializationController } from './controllers/specialization.controller';
import { SpecializationService } from './specialization.service';
import { GetSpecializationsUseCase } from './use-cases/get-specializations.usecase';
import { ExpertAuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Specialization]), ExpertAuthModule],
  controllers: [SpecializationController],
  providers: [SpecializationService, GetSpecializationsUseCase],
  exports: [SpecializationService, GetSpecializationsUseCase, TypeOrmModule],
})
export class SpecializationModule {}

