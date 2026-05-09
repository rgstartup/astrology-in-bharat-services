import { Injectable, Logger } from '@nestjs/common';
import { AuthProfileCreationStrategy } from './auth-profile-creation.strategy';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { QueryRunner } from 'typeorm';
import { ProfileMerchant, MerchantStatus } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

@Injectable()
export class MerchantAuthProfileCreationStrategy implements AuthProfileCreationStrategy {
  private readonly logger = new Logger(MerchantAuthProfileCreationStrategy.name);
  readonly role = 'merchant';

  async ensureProfile(user: User, queryRunner?: QueryRunner): Promise<void> {
    const manager = queryRunner?.manager;
    if (!manager) {
      throw new Error('MerchantAuthProfileCreationStrategy requires a Database transaction (QueryRunner)');
    }

    const existingProfile = await manager.findOne(ProfileMerchant, {
      where: { user_id: user.id },
    });

    if (!existingProfile) {
      this.logger.log(`Creating Merchant profile for user: ${user.id}`);
      
      const newProfile = manager.create(ProfileMerchant, {
        user: { id: user.id },
        user_id: user.id,
        shopName: user.name, // Will be populated with Google Name if Google Auth is used
        status: MerchantStatus.PENDING_VERIFICATION,
      });
      await manager.save(ProfileMerchant, newProfile);
    }
  }
}
