import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMerchant, MerchantStatus } from '../../infrastructure/entities/profile-merchant.entity';

@Injectable()
export class GetUniqueMerchantCitiesUseCase {
  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
  ) {}

  async execute() {
    const results = await this.merchantRepository
      .createQueryBuilder('merchant')
      .select('DISTINCT merchant.city', 'city')
      .where('merchant.status = :status', { status: MerchantStatus.ACTIVE })
      .andWhere('merchant.city IS NOT NULL')
      .getRawMany();

    const cities = results
      .map((r) => r.city)
      .filter((city) => city && city.trim() !== '')
      .sort();

    return {
      success: true,
      data: cities,
    };
  }
}
