import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { DatabaseService } from '@/core/database/database.service';
import {
  hasRoles,
  RoleEnum,
} from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class GetMerchantProfileUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly db: DatabaseService,
  ) {}

  async execute(userId: string) {
    const user = await this.usersFacade.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { ProfileMerchant } = await import(
      '../../../merchant/profile/infrastructure/entities/profile-merchant.entity'
    );
    const merchantProfile = await this.db.transaction(async (qr) => {
      return qr.manager.findOne(ProfileMerchant, {
        where: { user: { id: userId } },
      });
    });

    const isMerchant = hasRoles(user.roles, 'MERCHANT');
    if (!isMerchant) {
      throw new NotFoundException('Merchant profile not found for this user');
    }

    return {
      merchantId: merchantProfile?.uid || merchantProfile?.id || user.id,
      shopName: merchantProfile?.shopName || user.name,
      email: user.email,
      role: RoleEnum.MERCHANT,
      status: merchantProfile?.status || 'pending_verification',
    };
  }
}
