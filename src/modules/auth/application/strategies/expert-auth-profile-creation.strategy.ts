import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { AuthProfileCreationStrategy } from './auth-profile-creation.strategy';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class ExpertAuthProfileCreationStrategy
  implements AuthProfileCreationStrategy
{
  readonly role = RoleEnum.EXPERT;

  constructor(private readonly expertProfileFacade: ExpertProfileFacade) {}

  async ensureProfile(user: User, queryRunner?: QueryRunner): Promise<void> {
    const profile = await this.expertProfileFacade.getExpertByUserId(
      user.id,
      queryRunner,
    );
    if (!profile) {
      await this.expertProfileFacade.createProfile(
        user,
        {
          full_name: user.name || '',
        } as any,
        queryRunner,
      );
    }
  }
}
