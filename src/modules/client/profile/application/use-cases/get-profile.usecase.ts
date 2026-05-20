import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileClient } from '../../infrastructure/entities/profile-client.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class GetProfileUseCase {
  constructor(
    @InjectRepository(ProfileClient)
    private readonly repo: Repository<ProfileClient>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) { }

  async execute(userId: number, queryRunner?: QueryRunner) {
    const profileRepo = queryRunner ? queryRunner.manager.getRepository(ProfileClient) : this.repo;
    const userRepo = queryRunner ? queryRunner.manager.getRepository(User) : this.userRepo;

    const profile = await profileRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!profile) {
      // Check if user exists and what their role is
      const user = await userRepo.findOne({ where: { id: userId } });
      
      const roles = user?.roles || [];
      const hasClientRole = roles.includes('client' as any);
      const hasExpertRole = roles.includes('expert' as any);

      if (hasExpertRole && !hasClientRole) {
        throw new ForbiddenException('Aap ek Expert hain. Kripya Expert Dashboard se login karein.');
      }

      // If it's a client but no profile, return null or a basic structure
      // We return null so the frontend knows it needs to be created
      return null;
    }

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
