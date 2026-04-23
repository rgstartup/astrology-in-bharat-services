import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';

@Injectable()
export class GetExpertDetailUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly walletFacade: WalletFacade,
    @InjectRepository(ProfileExpert)
    private readonly expertProfileRepo: Repository<ProfileExpert>,
  ) {}

  async execute(id: number) {
    const user = await this.usersFacade.findById(id);
    if (!user) throw new NotFoundException('User not found');

    const profile = await this.expertProfileRepo.findOne({
      where: { better_auth_user_id: user.better_auth_user_id },
      relations: ['addresses', 'pujas'],
    });

    const totalEarnings = await this.walletFacade.getTotalEarnings(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      gender: profile?.gender ?? null,
      dob: profile?.date_of_birth ? new Date(profile.date_of_birth).toISOString() : null,
      phone: profile?.phone_number ?? '',
      languages: profile?.languages ? profile.languages.split(',').map((l) => l.trim()) : [],
      bio: profile?.bio ?? '',
      experience: profile?.experience_in_years ?? 0,
      specialization: profile?.specialization ?? '',
      rating: profile?.rating ?? 0,
      consultationCount: profile?.consultation_count ?? 0,
      totalEarnings,
      intro_video_url: profile?.video ?? (profile?.videos?.[0] ?? ''),
      gallery: profile?.gallery ?? [],
      documents: profile?.documents ?? [],
      addresses: profile?.addresses?.map((addr) => ({
        houseNo: addr.house_no ?? '',
        district: addr.district ?? '',
        city: addr.city ?? '',
        state: addr.state ?? '',
        country: addr.country ?? '',
        pincode: addr.pincode ?? addr.zip_code ?? '',
      })) ?? [],
      kyc_details: {
        status: profile?.kyc_status ?? 'pending',
        reason: profile?.rejection_reason ?? null,
      },
    };
  }
}
