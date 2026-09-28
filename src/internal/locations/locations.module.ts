import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StateEntity } from './entities/state.entity';
import { DistrictEntity } from './entities/district.entity';
import { LocationsController } from './controllers/locations.controller';
import { SeedLocationsUseCase } from './use-cases/seed-locations.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([StateEntity, DistrictEntity])],
  controllers: [LocationsController],
  providers: [SeedLocationsUseCase],
  exports: [],
})
export class LocationsModule {}
