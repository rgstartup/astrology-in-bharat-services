import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, FindOptionsWhere } from 'typeorm';
import { ProfileClient } from '../../infrastructure/entities/profile-client.entity';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { hasRoles } from '@/modules/users/infrastructure/enums/Role.enum';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class GetProfileUseCase {
  constructor(
    @InjectRepository(ProfileClient)
    private readonly repo: Repository<ProfileClient>,
    private readonly usersFacade: UsersFacade,
  ) {}

  async execute(user: IUser, queryRunner?: QueryRunner) {
    const profileRepo = queryRunner
      ? queryRunner.manager.getRepository(ProfileClient)
      : this.repo;

    const where: FindOptionsWhere<ProfileClient> = user.profile
      ? { id: user.profile, user: { id: user.id } }
      : { user: { id: user.id } };

    const profile = await profileRepo.findOne({
      where,
      relations: ['user'],
    });

    if (!profile) {
      // Check if user exists and what their role is
      const existingUser = await this.usersFacade.findById(
        user.id,
        queryRunner,
      );

      if (!existingUser) {
        return null; // Should not happen, but satisfies TS
      }

      const roles = existingUser.roles || [];
      const hasClientRole = hasRoles(roles, 'CLIENT');
      const hasExpertRole = hasRoles(roles, 'EXPERT');

      if (hasExpertRole && !hasClientRole) {
        throw new ForbiddenException(
          'Aap ek Expert hain. Kripya Expert Dashboard se login karein.',
        );
      }

      // If it's a client but no profile, return null or a basic structure
      // Return the base user so frontend knows they are logged in but need onboarding
      return {
        id: null, // No profile ID yet
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          roles: existingUser.roles,
          avatar: existingUser.avatar,
        }
      } as any; // Cast to 'any' to satisfy ProfileClient return type for other internal use-cases
    }

    // Priority: 1. Client profile's local avatar, 2. User's global avatar (master)
    const resolvedProfilePicture =
      profile.profile_picture || profile.user?.avatar || null;
      
    console.log(`[GetProfileUseCase] User ${user.id} - DB user.avatar: ${profile.user?.avatar}, profile_picture: ${profile.profile_picture} -> resolved: ${resolvedProfilePicture}`);

    return {
      ...profile,
      profile_picture: resolvedProfilePicture, // Always the final, resolved picture
    };
  }
}
