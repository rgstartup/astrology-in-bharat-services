import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMerchant, MerchantStatus } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

@Injectable()
export class UpdateMerchantStatusAdminUseCase {
  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
  ) {}

  async execute(id: string, data: { status: string }) {
    const profile = await this.merchantRepository
      .createQueryBuilder('merchant')
      .where('merchant.id = :id', { id })
      .getOne();

    if (!profile) {
      throw new NotFoundException('Merchant profile not found');
    }

    const newStatus = data.status ? (data.status.toLowerCase() as MerchantStatus) : profile.status;
    // Important: isVerified is now strictly tied to the overall status being ACTIVE
    const isVerified = newStatus === MerchantStatus.ACTIVE;

    // Direct SQL update using QueryBuilder to ensure it hits the correct columns
    await this.merchantRepository
      .createQueryBuilder()
      .update(ProfileMerchant)
      .set({
        status: newStatus,
        isVerified: isVerified
      })
      .where("id = :id", { id })
      .execute();

    console.log(`[DEBUG] Force Updated merchant ${id} to status: ${newStatus}. isVerified: ${isVerified}`);

    return {
      success: true,
      message: 'Merchant status updated successfully',
      data: {
        id,
        status: newStatus,
        isVerified: isVerified
      },
    };
  }
}
