import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}

  async execute(): Promise<void> {
    const rawData = INDIAN_STATES;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const stateData of rawData) {
        const stateName = stateData.state;
        const stateCode = stateName.substring(0, 2).toUpperCase();

        // Check if state exists
        let state = await queryRunner.manager.findOne(StateEntity, {
          where: { name: stateName },
        });

        if (!state) {
          state = queryRunner.manager.create(StateEntity, {
            name: stateName,
            code: stateCode,
          });
          state = await queryRunner.manager.save(StateEntity, state);
          this.logger.log(`Created state: ${state.name}`);
        }

        // Seed districts
        for (const districtName of stateData.districts) {
          const districtExists = await queryRunner.manager.findOne(DistrictEntity, {
            where: { name: districtName, state_id: state.id },
          });

          if (!districtExists) {
            const district = queryRunner.manager.create(DistrictEntity, {
              name: districtName,
              state_id: state.id,
            });
            await queryRunner.manager.save(DistrictEntity, district);
          }
        }
        this.logger.log(`Seeded districts for state: ${state.name}`);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
