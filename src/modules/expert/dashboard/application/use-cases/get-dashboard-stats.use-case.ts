import { Injectable } from '@nestjs/common';
import { ChatFacade } from '@/modules/chat/application/chat.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { DashboardPolicy } from '../../domain/policies/dashboard.policy';
import { ChatSessionStatus } from '@/modules/chat/infrastructure/persistence/entities/chat-session.entity';
import { CallSession, CallSessionStatus } from '@/modules/call/infrastructure/persistence/entities/call-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    private readonly chatFacade: ChatFacade,
    private readonly walletFacade: WalletFacade,
    private readonly profileFacade: ExpertProfileFacade,
    @InjectRepository(CallSession) private readonly callSessionRepo: Repository<CallSession>,
  ) { }

  async execute(userId: string, type: 'today' | 'total' = 'today') {
    const expertProfile = await this.profileFacade.getExpertByUserId(userId);

    DashboardPolicy.ensureProfileExists(expertProfile);

    const expertId = expertProfile.id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (type === 'today') {
      const todayAppointments = await this.chatFacade.getExpertSessionCount(expertId, {
        startDate: startOfToday,
      });
      const todayCallAppointments = await this.callSessionRepo.count({
        where: { expert_id: expertId, created_at: MoreThanOrEqual(startOfToday) },
      });

      const completedToday = await this.chatFacade.getExpertSessionCount(expertId, {
        status: ChatSessionStatus.COMPLETED,
        startDate: startOfToday,
      });
      const completedCallsToday = await this.callSessionRepo.count({
        where: { expert_id: expertId, status: CallSessionStatus.COMPLETED, created_at: MoreThanOrEqual(startOfToday) },
      });

      const expiredToday = await this.chatFacade.getExpertSessionCount(expertId, {
        status: [ChatSessionStatus.EXPIRED, ChatSessionStatus.CANCELLED],
        startDate: startOfToday,
      });
      const expiredCallsToday = await this.callSessionRepo.count({
        where: { expert_id: expertId, status: In([CallSessionStatus.EXPIRED, CallSessionStatus.CANCELLED, CallSessionStatus.REJECTED]), created_at: MoreThanOrEqual(startOfToday) },
      });

      const todayEarnings = await this.walletFacade.getTotalEarnings(expertProfile.user_id, {
        startDate: startOfToday,
      });

      return {
        today_appointments: todayAppointments + todayCallAppointments,
        completed_today: completedToday + completedCallsToday,
        expired_today: expiredToday + expiredCallsToday,
        today_earnings: todayEarnings,
      };
    } else {
      const totalAppointments = await this.chatFacade.getExpertSessionCount(expertId);
      const totalCallAppointments = await this.callSessionRepo.count({
        where: { expert_id: expertId },
      });

      const totalCompleted = await this.chatFacade.getExpertSessionCount(expertId, {
        status: ChatSessionStatus.COMPLETED,
      });
      const totalCompletedCalls = await this.callSessionRepo.count({
        where: { expert_id: expertId, status: CallSessionStatus.COMPLETED },
      });

      const totalExpired = await this.chatFacade.getExpertSessionCount(expertId, {
        status: [ChatSessionStatus.EXPIRED, ChatSessionStatus.CANCELLED],
      });
      const totalExpiredCalls = await this.callSessionRepo.count({
        where: { expert_id: expertId, status: In([CallSessionStatus.EXPIRED, CallSessionStatus.CANCELLED, CallSessionStatus.REJECTED]) },
      });

      const totalEarnings = await this.walletFacade.getTotalEarnings(expertProfile.user_id);

      return {
        total_appointments: totalAppointments + totalCallAppointments,
        total_completed: totalCompleted + totalCompletedCalls,
        total_expired: totalExpired + totalExpiredCalls,
        total_earnings: totalEarnings,
      };
    }
  }
}
