import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/entities/profile-expert.entity';

@Injectable()
export class UpdateProfileWithQueryRunnerUseCase {
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
  ) {}

  async execute(
    userId: string,
    updates: import('typeorm/query-builder/QueryPartialEntity').QueryDeepPartialEntity<ProfileExpert>,
    queryRunner: QueryRunner,
  ) {
    await queryRunner.manager.update(
      ProfileExpert,
      { user: { id: userId as unknown as string } },
      updates,
    );
  }
}
