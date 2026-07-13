import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StateEntity } from '../../infrastructure/entities/state.entity';
import { DistrictEntity } from '../../infrastructure/entities/district.entity';

import { INDIAN_STATES } from './indian-states.data';

@Injectable()
export class SeedLocationsUseCase {
  private readonly logger = new Logger(SeedLocationsUseCase.name);

  constructor(
    @InjectRepository(StateEntity)
    private readonly stateRepository: Repository<StateEntity>,
    @InjectRepository(DistrictEntity)
    private readonly districtRepository: Repository<DistrictEntity>,
  ) {}

  async execute(): Promise<void> {
    const rawData = INDIAN_STATES;

    for (const stateData of rawData) {
      const stateName = stateData.state;
      const stateCode = stateName.substring(0, 2).toUpperCase();

      // Check if state exists
      let state = await this.stateRepository.findOne({ where: { name: stateName } });
      
      if (!state) {
        state = this.stateRepository.create({
          name: stateName,
          code: stateCode,
        });
        state = await this.stateRepository.save(state);
        this.logger.log(`Created state: ${state.name}`);
      }

      // Seed districts
      for (const districtName of stateData.districts) {
        const districtExists = await this.districtRepository.findOne({
          where: { name: districtName, state_id: state.id },
        });

        if (!districtExists) {
          const district = this.districtRepository.create({
            name: districtName,
            state_id: state.id,
          });
          await this.districtRepository.save(district);
        }
      }
      this.logger.log(`Seeded districts for state: ${state.name}`);
    }
  }
}
