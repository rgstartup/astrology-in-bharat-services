import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSessionStatus } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { ChatSessionStatus } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ClientProfileFacade } from '@/modules/client/profile/application/profile.facade';
import { CallFacade } from '@/modules/consultation/call/application/call.facade';

@Injectable()
export class GetExpertDetailUseCase {
  constructor(
    @Inject(forwardRef(() => UsersFacade))
    private readonly usersFacade: UsersFacade,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    @Inject(forwardRef(() => ChatFacade))
    private readonly chatFacade: ChatFacade,
    @Inject(forwardRef(() => CallFacade))
    private readonly callFacade: CallFacade,
    @Inject(forwardRef(() => ClientProfileFacade))
    private readonly clientProfileFacade: ClientProfileFacade,
    @InjectRepository(ProfileExpert)
    private readonly profileExpertRepo: Repository<ProfileExpert>,
  ) {}

  async execute(id: string) {
    const user = await this.usersFacade.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.profileExpertRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['addresses'],
    });

    const clientProfile = await this.clientProfileFacade.getProfile({ id: user.id, email: user.email || '', roles: [] });
    const expertProfileId =
      profile?.id || '00000000-0000-0000-0000-000000000000';
    const total_earnings = await this.walletFacade.getTotalEarnings(
      expertProfileId,
      'expert_id',
    );

    const chatCount = await this.chatFacade.getExpertSessionCount(
      expertProfileId,
      {
        status: ChatSessionStatus.COMPLETED,
      },
    );

    const callCount = await this.callFacade.getExpertSessionCount(
      expertProfileId,
      {
        status: CallSessionStatus.COMPLETED,
      },
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      gender: profile?.gender || null,
      dob: profile?.date_of_birth
        ? new Date(profile.date_of_birth).toISOString()
        : null,
      phone: profile?.phone_number || (clientProfile as any)?.phone || '',
      languages: profile?.languages ? profile.languages.split(',') : [],
      bio: profile?.bio || '',
      experience: profile?.experience_in_years || 0,
      specialization: profile?.specialization || '',
      rating: profile?.rating || 0,
      consultationCount: chatCount + callCount,
      total_earnings: total_earnings,
      intro_video_url:
        profile?.video ||
        (profile?.videos && profile.videos.length > 0 ? profile.videos[0] : ''),
      gallery: profile?.gallery || [],
      documents: profile?.documents || [],
      addresses:
        profile?.addresses?.map((addr) => ({
          houseNo: addr.house_no || '',
          district: addr.district || '',
          city: addr.city || '',
          state: addr.state || '',
          country: addr.country || '',
          pincode: addr.pincode || addr.zip_code || '',
        })) || [],
      kyc_details: {
        status: profile?.kyc_status || 'pending',
        reason: profile?.rejection_reason || null,
      },
    };
  }
}
