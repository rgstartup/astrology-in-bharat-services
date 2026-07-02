import { Injectable } from '@nestjs/common';
import { CreateProfileClientDto } from '@/modules/client/profile/infrastructure/dto/profile-client.dto';
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
      { id: user.id, email: user.email || '', roles: [] },
      queryRunner,
    );
    if (!profile) {
      await this.clientProfileFacade.createProfile(
        user.id,
        {
          full_name: user.name || '',
          avatar: user.avatar,
          profile_picture: user.avatar,
        } as unknown as CreateProfileClientDto,
        queryRunner,
      );
    }
  }
}
