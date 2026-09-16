import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import {
  hasRoles,
  RoleEnum,
} from '@/modules/users/enums/Role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';
import { MerchantAccount } from '@/modules/merchant/account/entities/account.entity';

@Injectable()
export class GetMerchantProfileUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MerchantAccount)
    private readonly profileMerchantRepository: Repository<MerchantAccount>,
    private readonly db: DatabaseService,
  ) { }

  async execute(userId: number | string) {
    const [user, merchantProfile] = await Promise.all([
      this.userRepository.findOne({ where: { id: Number(userId) } }),
      this.profileMerchantRepository.findOne({
        where: { user_id: Number(userId) },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMerchant = hasRoles(user.role, 'MERCHANT');
    if (!isMerchant) {
      throw new NotFoundException('Merchant profile not found for this user');
    }

    return {
      merchantId: merchantProfile?.uid || merchantProfile?.id || user.id,
      shopName: merchantProfile?.shop_name || user.name,
      email: user.email,
      role: RoleEnum.MERCHANT,
      status: merchantProfile?.status || 'pending_verification',
    };
  }
}
