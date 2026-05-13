import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

import { ChatFacade } from '@/modules/chat/application/chat.facade';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession, CallSessionStatus } from '@/modules/call/infrastructure/entities/call-session.entity';
import { ChatSessionStatus } from '@/modules/chat/infrastructure/entities/chat-session.entity';

@Injectable()
export class GetExpertDetailUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly walletFacade: WalletFacade,
    private readonly chatFacade: ChatFacade,
    @InjectRepository(CallSession)
    private readonly callSessionRepo: Repository<CallSession>,
  ) { }

  async execute(id: number) {
    const user = await this.usersFacade.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = user.profile_expert;
    const totalEarnings = await this.walletFacade.getTotalEarnings(user.id);
    const chatCount = await this.chatFacade.getExpertSessionCount(profile?.id || 0, {
      status: ChatSessionStatus.COMPLETED
    });

    const callCount = await this.callSessionRepo.count({
      where: { expert_id: profile?.id || 0, status: CallSessionStatus.COMPLETED }
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      gender: profile?.gender || null,
      dob: profile?.date_of_birth ? new Date(profile.date_of_birth).toISOString() : null,
      phone: profile?.phone_number || user.profile_client?.phone || '',
      languages: profile?.languages ? profile.languages.split(',') : [],
      bio: profile?.bio || '',
      experience: profile?.experience_in_years || 0,
      specialization: profile?.specialization || '',
      rating: profile?.rating || 0,
      consultationCount: chatCount + callCount,
      totalEarnings: totalEarnings,
      intro_video_url: profile?.video || (profile?.videos && profile.videos.length > 0 ? profile.videos[0] : ''),
      gallery: profile?.gallery || [],
      documents: profile?.documents || [],
      addresses: profile?.addresses?.map(addr => ({
        houseNo: addr.house_no || '',
        district: addr.district || '',
        city: addr.city || '',
        state: addr.state || '',
        country: addr.country || '',
        pincode: addr.pincode || addr.zip_code || ''
      })) || [],
      kyc_details: {
        status: profile?.kyc_status || 'pending',
        reason: profile?.rejection_reason || null,
      },
    };
  }
}
