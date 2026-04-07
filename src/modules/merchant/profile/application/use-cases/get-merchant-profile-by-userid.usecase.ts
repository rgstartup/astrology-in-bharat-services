import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMerchant } from '../../infrastructure/persistence/entities/profile-merchant.entity';

@Injectable()
export class GetMerchantProfileByUserIdUseCase {
  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly profileRepository: Repository<ProfileMerchant>,
  ) {}

  async execute(userId: number) {
    const profile = await this.profileRepository.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new NotFoundException('Merchant profile not found');
    }

    return profile;
  }
}
