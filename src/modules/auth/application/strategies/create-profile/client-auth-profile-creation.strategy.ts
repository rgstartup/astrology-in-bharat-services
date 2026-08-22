import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { AuthProfileCreationStrategy } from './auth-profile-creation.strategy';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

@Injectable()
export class ClientAuthProfileCreationStrategy
  implements AuthProfileCreationStrategy<ProfileClient> {
  readonly role = RoleEnum.CLIENT;

  async ensureProfile(user: User, queryRunner: QueryRunner): Promise<ProfileClient> {

    const clientProfileRepo = queryRunner.manager.getRepository(ProfileClient);

    const existingProfile = await clientProfileRepo.findOne({ where: { user_id: user.id } });
    if (existingProfile) return existingProfile;

    const profile = clientProfileRepo.create({
      user_id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    });

    return clientProfileRepo.save(profile);
  }
}
