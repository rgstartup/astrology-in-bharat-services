import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class GetExpertDetailUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly walletFacade: WalletFacade,
  ) { }

  async execute(id: number) {
    const user = await this.usersFacade.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profile_expert) {
      throw new NotFoundException('Expert profile not found for this user');
    }

    const profile = user.profile_expert;
    const totalEarnings = await this.walletFacade.getTotalEarnings(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      gender: profile.gender,
      date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString() : null,
      phone_number: profile.phone_number || user.profile_client?.phone || '',
      languages: profile.languages ? profile.languages.split(',') : [],
      bio: profile.bio || '',
      experience_in_years: profile.experience_in_years,
      specialization: profile.specialization || '',
      rating: profile.rating,
      consultation_count: profile.consultation_count,
      total_earnings: totalEarnings,
      intro_video_url: profile.video || (profile.videos && profile.videos.length > 0 ? profile.videos[0] : ''),
      gallery: profile.gallery || [],
      documents: profile.documents || [],
      addresses: profile.addresses?.map(addr => ({
        house_no: addr.house_no || '',
        district: addr.district || '',
        city: addr.city || '',
        state: addr.state || '',
        country: addr.country || '',
        pincode: addr.pincode || addr.zip_code || ''
      })) || [],
      kyc_status: profile.kyc_status,
      rejection_reason: profile.rejection_reason,
    };
  }
}
