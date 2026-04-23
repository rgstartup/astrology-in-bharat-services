import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/persistence/entities/profile-expert.entity';

@Injectable()
export class GetExpertByUserIdUseCase {
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly expertProfileRepo: Repository<ProfileExpert>,
  ) { }

  async execute(userId: string, queryRunner?: QueryRunner) {
    const repo = queryRunner ? queryRunner.manager.getRepository(ProfileExpert) : this.expertProfileRepo;
    return repo.findOne({
      where: { better_auth_user_id: userId },
    });
  }
}
