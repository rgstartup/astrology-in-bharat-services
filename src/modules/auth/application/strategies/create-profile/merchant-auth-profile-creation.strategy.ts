import { Injectable, Logger } from '@nestjs/common';
import { AuthProfileCreationStrategy } from './auth-profile-creation.strategy';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { QueryRunner } from 'typeorm';
import {
  MerchantAccount,
  MerchantStatus,
} from '@/modules/merchant/account/entities/account.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class MerchantAuthProfileCreationStrategy
  implements AuthProfileCreationStrategy<MerchantAccount> {
  private readonly logger = new Logger(
    MerchantAuthProfileCreationStrategy.name,
  );
  readonly role = RoleEnum.MERCHANT;

  async ensureProfile(user: User, queryRunner: QueryRunner): Promise<MerchantAccount> {
    const merchantAccountRepo = queryRunner.manager.getRepository(MerchantAccount);

    const existingProfile = await merchantAccountRepo.findOne({ where: { user_id: user.id } });
    if (existingProfile) return existingProfile;

    const newProfile = merchantAccountRepo.create({
      user: user,
      shop_name: user.name,
      avatar: user.avatar,
      image: user.avatar,
      status: MerchantStatus.PENDING_VERIFICATION,
    });

    return merchantAccountRepo.save(newProfile);
  }
}

