import { Injectable } from '@nestjs/common';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { ReviewsFacade } from '@/modules/consultation/reviews/application/reviews.facade';
import { DashboardPolicy } from '../../domain/policies/dashboard.policy';
import { ChatSessionStatus } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { CallSession, CallSessionStatus } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    private readonly chatFacade: ChatFacade,
    private readonly walletFacade: WalletFacade,
    private readonly profileFacade: ExpertProfileFacade,
    private readonly reviewsFacade: ReviewsFacade,
    @InjectRepository(CallSession) private readonly callSessionRepo: Repository<CallSession>,
  ) { }

  async execute(userId: string, type: 'today' | 'total' = 'today') {
    const expertProfile = await this.profileFacade.getExpertByUserId(userId);

    DashboardPolicy.ensureProfileExists(expertProfile);

    const expertId = expertProfile.id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const reviewStats = await this.reviewsFacade.getReviewsStats(expertId as any);

    if (type === 'today') {
      const todayChatAppointments = await this.chatFacade.getExpertSessionCount(expertId as any, {
        startDate: startOfToday,
      });
      const todayCallAppointments = await this.callSessionRepo.count({
        where: { expert_id: expertId, created_at: MoreThanOrEqual(startOfToday) },
      });

      const completedToday = await this.chatFacade.getExpertSessionCount(expertId as any, {
        status: ChatSessionStatus.COMPLETED,
        startDate: startOfToday,
      });
      const completedCallsToday = await this.callSessionRepo.count({
        where: { expert_id: expertId, status: CallSessionStatus.COMPLETED, created_at: MoreThanOrEqual(startOfToday) },
      });

      const expiredToday = await this.chatFacade.getExpertSessionCount(expertId as any, {
        status: [ChatSessionStatus.EXPIRED, ChatSessionStatus.CANCELLED],
        startDate: startOfToday,
      });
      const expiredCallsToday = await this.callSessionRepo.count({
        where: { expert_id: expertId, status: In([CallSessionStatus.EXPIRED, CallSessionStatus.CANCELLED, CallSessionStatus.REJECTED]), created_at: MoreThanOrEqual(startOfToday) },
      });

      const todayEarnings = await this.walletFacade.getTotalEarnings(userId, {
        startDate: startOfToday,
      });

      const walletBalance = await this.walletFacade.getBalance(userId as any);

      return {
        today_appointments: todayChatAppointments + todayCallAppointments,
        completed_today: completedToday + completedCallsToday,
        expired_today: expiredToday + expiredCallsToday,
        today_earnings: todayEarnings,
        wallet_balance: walletBalance,
        average_rating: reviewStats?.rating || 0,
        total_reviews: reviewStats?.totalReviews || 0,
        total_chat_sessions: todayChatAppointments + todayCallAppointments, // Standardized for dashboard cards
      };
    } else {
      const totalChatAppointments = await this.chatFacade.getExpertSessionCount(expertId as any);
      const totalCallAppointments = await this.callSessionRepo.count({
        where: { expert_id: expertId },
      });

      const totalCompleted = await this.chatFacade.getExpertSessionCount(expertId as any, {
        status: ChatSessionStatus.COMPLETED,
      });
      const totalCompletedCalls = await this.callSessionRepo.count({
        where: { expert_id: expertId, status: CallSessionStatus.COMPLETED },
      });

      const totalExpired = await this.chatFacade.getExpertSessionCount(expertId as any, {
        status: [ChatSessionStatus.EXPIRED, ChatSessionStatus.CANCELLED],
      });
      const totalExpiredCalls = await this.callSessionRepo.count({
        where: { expert_id: expertId, status: In([CallSessionStatus.EXPIRED, CallSessionStatus.CANCELLED, CallSessionStatus.REJECTED]) },
      });

      const totalEarnings = await this.walletFacade.getTotalEarnings(userId);
      const walletBalance = await this.walletFacade.getBalance(userId as any);

      return {
        total_appointments: totalChatAppointments + totalCallAppointments,
        total_completed: totalCompleted + totalCompletedCalls,
        total_expired: totalExpired + totalExpiredCalls,
        total_earnings: totalEarnings,
        wallet_balance: walletBalance,
        average_rating: reviewStats?.rating || 0,
        total_reviews: reviewStats?.totalReviews || 0,
        total_chat_sessions: totalChatAppointments + totalCallAppointments, // Standardized for dashboard cards
      };
    }
  }
}
