import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileMerchant } from '../../infrastructure/entities/profile-merchant.entity';

@Injectable()
export class UpdateProfileWithQueryRunnerUseCase {
  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly profileRepo: Repository<ProfileMerchant>,
  ) {}

  async execute(
    userId: string,
    updates: Partial<ProfileMerchant>,
    queryRunner: QueryRunner,
  ) {
    let profile = await queryRunner.manager.findOne(ProfileMerchant, {
      where: { user_id: userId as unknown as ProfileMerchant['user_id'] },
    });

    if (profile) {
      Object.assign(profile, updates);
      await queryRunner.manager.save(ProfileMerchant, profile);
    } else {
      profile = queryRunner.manager.create(ProfileMerchant, {
        user: { id: userId },
        user_id: userId,
        ...updates,
      });
      await queryRunner.manager.save(ProfileMerchant, profile);
    }
  }
}
