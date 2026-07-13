import { Controller, Get, Query, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StateEntity } from '../../infrastructure/entities/state.entity';
import { DistrictEntity } from '../../infrastructure/entities/district.entity';
import { SeedLocationsUseCase } from '../../application/use-cases/seed-locations.use-case';

@Controller('locations')
export class LocationsController {
  constructor(
    @InjectRepository(StateEntity)
    private readonly stateRepository: Repository<StateEntity>,
    @InjectRepository(DistrictEntity)
    private readonly districtRepository: Repository<DistrictEntity>,
    private readonly seedLocationsUseCase: SeedLocationsUseCase,
  ) {}

  @Get('states')
  async getStates() {
    return this.stateRepository.find({
      order: { name: 'ASC' },
    });
  }

  @Get('districts')
  async getDistricts(@Query('state_id') stateId: string) {
    if (!stateId) {
      return [];
    }
    return this.districtRepository.find({
      where: { state_id: stateId },
      order: { name: 'ASC' },
    });
  }

  @Post('seed')
  async seedLocations() {
    await this.seedLocationsUseCase.execute();
    return { message: 'Locations seeded successfully' };
  }
}
