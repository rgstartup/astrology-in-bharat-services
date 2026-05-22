// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { DatabaseService } from '@/core/database/database.service';

@Injectable()
export class GetMerchantProfileUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly db: DatabaseService,
  ) {}

  async execute(userId: number) {
    const user = await this.usersFacade.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Load merchant profile if not already loaded (though it might be via Eager loading if we configured that, but safer to check)
    // Actually UsersFacade.findById usually returns standard user.
    // We can use the DatabaseService to get the full profile if needed or use the repository directly via facade.
    
    // We already have the relation in User entity.
    const fullUser = await this.db.transaction(async (qr) => {
        return qr.manager.findOne('User', {
            where: { id: userId },
            relations: ['profile_merchant', 'roles']
        }) as any;
    });

    if (!fullUser) {
        throw new NotFoundException('User not found');
    }

    const isMerchant = fullUser.roles?.some((r) => r.name.toLowerCase() === 'merchant');
    if (!isMerchant) {
      throw new NotFoundException('Merchant profile not found for this user');
    }

    return {
      merchantId: fullUser.uid || fullUser.id.toString(),
      shopName: fullUser.profile_merchant?.shopName || fullUser.name,
      email: fullUser.email,
      role: 'merchant',
      status: fullUser.profile_merchant?.status || 'pending_verification',
    };
  }
}
