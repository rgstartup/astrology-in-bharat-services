import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import {
  hasRoles,
  RoleEnum,
} from '@/modules/users/infrastructure/enums/Role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

@Injectable()
export class GetMerchantProfileUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProfileMerchant)
    private readonly profileMerchantRepository: Repository<ProfileMerchant>,
    private readonly db: DatabaseService,
  ) {}

  async execute(userId: string) {
    const [user, merchantProfile] = await Promise.all([
      this.userRepository.findOne({ where: { id: userId } }),
      this.profileMerchantRepository.findOne({
        where: { user: { id: userId } },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

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
