import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';

@Injectable()
export class IncrementRegistrationsWithQueryRunnerUseCase {
  private readonly logger = new Logger(
    IncrementRegistrationsWithQueryRunnerUseCase.name,
  );

  constructor(
    @InjectRepository(ProfileAgent)
    private readonly profileRepo: Repository<ProfileAgent>,
  ) {}

  async execute(
    agentId: string,
    registeredUserId: string,
    isExpert: boolean,
    queryRunner: QueryRunner,
  ) {
    const agentProfile = await queryRunner.manager.findOne(ProfileAgent, {
      where: { user_id: agentId },
    });

    if (agentProfile) {
      const arrayField = isExpert
        ? 'registered_astrologer_ids'
        : 'registered_user_ids';

      if (!agentProfile[arrayField]) {
        agentProfile[arrayField] = [];
      }

      agentProfile[arrayField].push(registeredUserId);

      await queryRunner.manager.save(ProfileAgent, agentProfile);

      await queryRunner.manager.increment(
        ProfileAgent,
        { user_id: agentId },
        'total_registrations',
        1,
      );
    } else {
      this.logger.warn(
        `Agent profile not found for agent ID: ${agentId}. Skipping registration count increment.`,
      );
    }
  }
}
