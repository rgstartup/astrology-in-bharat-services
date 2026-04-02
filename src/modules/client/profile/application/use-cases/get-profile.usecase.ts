import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileClient } from '../../infrastructure/persistence/entities/profile-client.entity';

@Injectable()
export class GetProfileUseCase {
  constructor(
    @InjectRepository(ProfileClient)
    private readonly repo: Repository<ProfileClient>,
  ) { }

  async execute(userId: number, queryRunner?: QueryRunner) {
    const repo = queryRunner ? queryRunner.manager.getRepository(ProfileClient) : this.repo;
    const profile = await repo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!profile) return null;

    // Backend decides the final profile picture:
    // 1. If user manually uploaded a picture → use that (profile.profile_picture)
    // 2. Otherwise fallback to Gmail/OAuth avatar (profile.user.avatar)
    const resolvedProfilePicture = profile.profile_picture || profile.user?.avatar || null;

    return {
      ...profile,
      profile_picture: resolvedProfilePicture, // Always the final, resolved picture
    };
  }
}
