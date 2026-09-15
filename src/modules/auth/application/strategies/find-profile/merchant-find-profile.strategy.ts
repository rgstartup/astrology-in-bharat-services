import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantAccount } from '@/modules/merchant/account/entities/account.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { IFindProfileStrategy } from './find-profile.strategy';

@Injectable()
export class MerchantFindProfileStrategy implements IFindProfileStrategy {
  constructor(
    @InjectRepository(MerchantAccount)
    private readonly profileRepo: Repository<MerchantAccount>,
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

