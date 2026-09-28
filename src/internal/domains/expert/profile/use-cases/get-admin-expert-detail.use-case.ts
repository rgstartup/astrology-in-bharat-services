import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UsersService } from '@/internal/users/users.service';
import { WalletService } from '@/internal/finance/wallet/wallet.service';

import { ChatService } from '@/internal/consultation/chat/chat.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSessionStatus } from '@/internal/consultation/call/enum';
import { ChatSessionStatus } from '@/internal/consultation/chat/enum';
import { ProfileExpert } from '@/internal/domains/expert/profile/entities/profile-expert.entity';
import { AccountService } from '@/internal/domains/client/account/account.service';
import { CallService } from '@/internal/consultation/call/call.service';

@Injectable()
export class GetExpertDetailUseCase {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => CallService))
    private readonly callService: CallService,
    @Inject(forwardRef(() => AccountService))
    private readonly accountService: AccountService,
    @InjectRepository(ProfileExpert)
    private readonly profileExpertRepo: Repository<ProfileExpert>,
  ) {}

  async execute(id: number) {
    const user = await this.usersService.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.profileExpertRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['addresses'],
    });

    const clientAccount = await this.accountService.getAccount({
      id: user.id,
    });
    const expertProfileId = profile?.id || 0;
    const total_earnings = await this.walletService.getTotalEarnings(
      expertProfileId,
      'expert_id',
    );

    const chatCount = await this.chatService.getExpertSessionCount(
      expertProfileId,
      {
        status: ChatSessionStatus.COMPLETED,
      },
    );

    const callCount = await this.callService.getExpertSessionCount(
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
      date_of_birth: profile?.date_of_birth
        ? new Date(profile.date_of_birth).toISOString()
        : null,
      phone_number: profile?.phone_number || clientAccount?.phone || '',
      languages: profile?.languages
        ? profile.languages.split(',').map((l: string) => l.trim())
        : [],
      bio: profile?.bio || '',
      about: profile?.about || '',
      experience_in_years: profile?.experience_in_years || 0,
      specialization: profile?.specialization || '',
      rating: profile?.rating || 0,
      consultation_count: chatCount + callCount,
      total_earnings: total_earnings,
      kyc_status: profile?.kyc_status || 'pending',
      rejection_reason: profile?.rejection_reason || null,
      intro_video_url:
        profile?.video ||
        (profile?.videos && profile.videos.length > 0 ? profile.videos[0] : ''),
      gallery: profile?.gallery || [],
      documents: profile?.documents || [],
      certificates: profile?.certificates || [],
      addresses:
        profile?.addresses?.map((addr) => ({
          house_no: addr.house_no || '',
          line1: addr.line1 || addr.house_no || '',
          district: addr.district || '',
          city: addr.city || addr.district || '',
          state: addr.state || '',
          country: addr.country || '',
          pincode: addr.pincode || addr.zip_code || '',
        })) || [],
    };
  }
}
