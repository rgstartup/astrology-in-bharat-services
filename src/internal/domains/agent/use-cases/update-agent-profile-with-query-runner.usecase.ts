import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { ProfileAgent } from '../entities/profile-agent.entity';

@Injectable()
export class UpdateAgentProfileWithQueryRunnerUseCase {
  async execute(
    agentId: number,
    updates: Record<string, unknown>,
    queryRunner: QueryRunner,
  ) {
    await queryRunner.manager.update(ProfileAgent, { id: agentId }, updates);
  }
}
