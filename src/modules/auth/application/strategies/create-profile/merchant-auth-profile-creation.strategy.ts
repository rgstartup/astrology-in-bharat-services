import { Injectable, Logger } from '@nestjs/common';
import { AuthProfileCreationStrategy } from './auth-profile-creation.strategy';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { QueryRunner } from 'typeorm';
import {
  ProfileMerchant,
  MerchantStatus,
} from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class MerchantAuthProfileCreationStrategy
  implements AuthProfileCreationStrategy<ProfileMerchant> {
  private readonly logger = new Logger(
    MerchantAuthProfileCreationStrategy.name,
  );
  readonly role = RoleEnum.MERCHANT;

  async ensureProfile(user: User, queryRunner: QueryRunner): Promise<ProfileMerchant> {
    const merchantProfileRepo = queryRunner.manager.getRepository(ProfileMerchant);

    const existingProfile = await merchantProfileRepo.findOne({ where: { user_id: user.id } });
    if (existingProfile) return existingProfile;

    const newProfile = merchantProfileRepo.create({
      user: user,
      shopName: user.name,
      avatar: user.avatar,
      image: user.avatar,
      status: MerchantStatus.PENDING_VERIFICATION,
    });

    return merchantProfileRepo.save(newProfile);
  }
}
