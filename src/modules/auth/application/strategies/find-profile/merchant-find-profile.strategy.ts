import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { IFindProfileStrategy } from './find-profile.strategy';

@Injectable()
export class MerchantFindProfileStrategy implements IFindProfileStrategy {
  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly profileRepo: Repository<ProfileMerchant>,
  ) {}

  supports(role: RoleEnum): boolean {
    return role === RoleEnum.MERCHANT;
  }

  async findProfile(userId: string): Promise<string | null> {
    const profile = await this.profileRepo.findOne({
      where: { user_id: userId },
      select: ['id'],
    });
    return profile?.id ?? null;
  }
}
