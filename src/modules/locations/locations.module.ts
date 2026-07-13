import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StateEntity } from './infrastructure/entities/state.entity';
import { DistrictEntity } from './infrastructure/entities/district.entity';
import { LocationsController } from './api/controllers/locations.controller';
import { SeedLocationsUseCase } from './application/use-cases/seed-locations.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([StateEntity, DistrictEntity])],
  controllers: [LocationsController],
  providers: [SeedLocationsUseCase],
  exports: [],
})
export class LocationsModule {}
