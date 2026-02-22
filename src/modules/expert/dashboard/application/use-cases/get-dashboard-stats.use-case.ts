import { Injectable } from '@nestjs/common';
import { ChatFacade } from '@/modules/chat/application/chat.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { DashboardPolicy } from '../../domain/policies/dashboard.policy';
import { ChatSessionStatus } from '@/modules/chat/infrastructure/persistence/entities/chat-session.entity';

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    private readonly chatFacade: ChatFacade,
    private readonly walletFacade: WalletFacade,
    private readonly profileFacade: ProfileFacade,
  ) {}

  async execute(userId: number, type: 'today' | 'total' = 'today') {
    const expertProfile = await this.profileFacade.getExpertByUserId(userId);

    DashboardPolicy.ensureProfileExists(expertProfile);

    const expertId = expertProfile.id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (type === 'today') {
      const todayAppointments = await this.chatFacade.getExpertSessionCount(expertId, {
        startDate: startOfToday,
      });

      const completedToday = await this.chatFacade.getExpertSessionCount(expertId, {
        status: ChatSessionStatus.COMPLETED,
        startDate: startOfToday,
      });

      const expiredToday = await this.chatFacade.getExpertSessionCount(expertId, {
        status: [ChatSessionStatus.EXPIRED, ChatSessionStatus.CANCELLED],
        startDate: startOfToday,
      });

      const todayEarnings = await this.walletFacade.getTotalEarnings(userId, {
        startDate: startOfToday,
      });

      return {
        today_appointments: todayAppointments,
        completed_today: completedToday,
        expired_today: expiredToday,
        today_earnings: todayEarnings,
      };
    } else {
      const totalAppointments = await this.chatFacade.getExpertSessionCount(expertId);

      const totalCompleted = await this.chatFacade.getExpertSessionCount(expertId, {
        status: ChatSessionStatus.COMPLETED,
      });

      const totalExpired = await this.chatFacade.getExpertSessionCount(expertId, {
        status: [ChatSessionStatus.EXPIRED, ChatSessionStatus.CANCELLED],
      });

      const totalEarnings = await this.walletFacade.getTotalEarnings(userId);

      return {
        total_appointments: totalAppointments,
        total_completed: totalCompleted,
        total_expired: totalExpired,
        total_earnings: totalEarnings,
      };
    }
  }
}
