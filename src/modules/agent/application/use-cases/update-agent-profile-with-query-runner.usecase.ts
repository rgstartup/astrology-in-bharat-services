import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';

@Injectable()
export class UpdateAgentProfileWithQueryRunnerUseCase {
  async execute(
    agentId: string,
    updates: Record<string, unknown>,
    queryRunner: QueryRunner,
  ) {
    await queryRunner.manager.update('ProfileAgent', { id: agentId }, updates);
  }
}
