import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { AuthProfileCreationStrategy } from './auth-profile-creation.strategy';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

@Injectable()
export class ExpertAuthProfileCreationStrategy
  implements AuthProfileCreationStrategy<ProfileExpert> {
  readonly role = RoleEnum.EXPERT;

  async ensureProfile(user: User, queryRunner: QueryRunner): Promise<ProfileExpert> {

    const profileExpertRepo = queryRunner.manager.getRepository(ProfileExpert)

    const profile = await profileExpertRepo.findOne({ where: { user_id: user.id } });

    if (profile) return profile;

    const newExpertProfile = profileExpertRepo.create({
      user: user,
      name: user.name,
      avatar: user.avatar,
    })

    return profileExpertRepo.save(newExpertProfile);
  }
}
