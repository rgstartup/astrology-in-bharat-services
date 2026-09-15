import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Specialization } from './entities/specialization.entity';
import { SpecializationController } from './controllers/specialization.controller';
import { SpecializationFacade } from './specialization.facade';
import { GetSpecializationsUseCase } from './use-cases/get-specializations.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([Specialization])],
  controllers: [SpecializationController],
  providers: [SpecializationFacade, GetSpecializationsUseCase],
  exports: [SpecializationFacade, GetSpecializationsUseCase, TypeOrmModule],
})
export class SpecializationModule {}
