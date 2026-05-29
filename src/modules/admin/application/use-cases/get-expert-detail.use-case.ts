// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession, CallSessionStatus } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { ChatSessionStatus } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

@Injectable()
export class GetExpertDetailUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly walletFacade: WalletFacade,
    private readonly chatFacade: ChatFacade,
    @InjectRepository(CallSession)
    private readonly callSessionRepo: Repository<CallSession>,
    @InjectRepository(ProfileExpert)
    private readonly profileExpertRepo: Repository<ProfileExpert>,
    @InjectRepository(ProfileClient)
    private readonly profileClientRepo: Repository<ProfileClient>,
  ) { }

  async execute(id: string) {

    const user = await this.usersFacade.findById(id);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.profileExpertRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['addresses']
    });
    
    const clientProfile = await this.profileClientRepo.findOne({
      where: { user: { id: user.id } }
    });
    const totalEarnings = await this.walletFacade.getTotalEarnings(user.id);
    const expertProfileId = profile?.id || '00000000-0000-0000-0000-000000000000';
    
    const chatCount = await this.chatFacade.getExpertSessionCount(expertProfileId, {
      status: ChatSessionStatus.COMPLETED
    });

    const callCount = await this.callSessionRepo.count({
      where: { expert_id: expertProfileId, status: CallSessionStatus.COMPLETED }
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      gender: profile?.gender || null,
      dob: profile?.date_of_birth ? new Date(profile.date_of_birth).toISOString() : null,
      phone: profile?.phone_number || clientProfile?.phone || '',
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
