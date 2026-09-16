import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileExpert } from '../entities/profile-expert.entity';

@Injectable()
export class UpdateProfileWithQueryRunnerUseCase {
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
  ) {}

  async execute(
    userId: number,
    updates: import('typeorm/query-builder/QueryPartialEntity').QueryDeepPartialEntity<ProfileExpert>,
    queryRunner: QueryRunner,
  ) {
    await queryRunner.manager.update(
      ProfileExpert,
      { user: { id: userId } },
      updates,
    );
  }
}
