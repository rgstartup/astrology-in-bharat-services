import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { ClientProfileFacade } from '@/modules/client/profile/application/profile.facade';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { AuthProfileCreationStrategy } from './auth-profile-creation.strategy';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class ClientAuthProfileCreationStrategy
  implements AuthProfileCreationStrategy
{
  readonly role = RoleEnum.CLIENT;

  constructor(private readonly clientProfileFacade: ClientProfileFacade) {}

  async ensureProfile(user: User, queryRunner?: QueryRunner): Promise<void> {
    const profile = await this.clientProfileFacade.getProfile(
      user.id,
      queryRunner,
    );
    if (!profile) {
      await this.clientProfileFacade.createProfile(
        user.id,
        {
          full_name: user.name || '',
        },
        queryRunner,
      );
    }
  }
}
