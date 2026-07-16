import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { ReviewsFacade } from '@/modules/consultation/reviews/application/reviews.facade';
import { ChatSessionStatus } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { CallSessionStatus } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { CallFacade } from '@/modules/consultation/call/application/call.facade';

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    @Inject(forwardRef(() => ChatFacade))
    private readonly chatFacade: ChatFacade,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    private readonly reviewsFacade: ReviewsFacade,
    @Inject(forwardRef(() => CallFacade))
    private readonly callFacade: CallFacade,
  ) {}

  async execute(expertProfileId: string, type: 'today' | 'total' = 'today') {
    if (!expertProfileId) {
      throw new Error('Expert profile ID is required');
    }

    const expert_id = expertProfileId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const reviewStats = await this.reviewsFacade.getReviewsStats(
      expert_id as unknown as string,
    );

    if (type === 'today') {
      const todayChatAppointments = await this.chatFacade.getExpertSessionCount(
        expert_id as unknown as string,
        {
          startDate: startOfToday,
        },
      );
      const todayCallAppointments = await this.callFacade.getExpertSessionCount(
        expert_id as unknown as string,
        {
          startDate: startOfToday,
        },
      );

      const completedToday = await this.chatFacade.getExpertSessionCount(
        expert_id as unknown as string,
        {
          status: 'completed' as unknown as ChatSessionStatus,
          startDate: startOfToday,
        },
      );
      const completedCallsToday = await this.callFacade.getExpertSessionCount(
        expert_id as unknown as string,
        {
          status: 'completed' as unknown as CallSessionStatus,
          startDate: startOfToday,
        },
      );

      const expiredToday = await this.chatFacade.getExpertSessionCount(
        expert_id as unknown as string,
        {
          status: ['expired', 'cancelled'] as unknown as ChatSessionStatus[],
          startDate: startOfToday,
        },
      );
      const expiredCallsToday = await this.callFacade.getExpertSessionCount(
        expert_id as unknown as string,
        {
          status: [
            'expired',
            'cancelled',
            'rejected',
          ] as unknown as CallSessionStatus[],
          startDate: startOfToday,
        },
      );

      const todayEarnings = await this.walletFacade.getTotalEarnings(
        expert_id,
        'expert_id',
        {
          startDate: startOfToday,
        },
      );

      const wallet_balance = await this.walletFacade.getBalance(
        expert_id,
        'expert_id',
      );

      return {
        today_appointments: todayChatAppointments + todayCallAppointments,
        completed_today: completedToday + completedCallsToday,
        expired_today: expiredToday + expiredCallsToday,
        today_earnings: todayEarnings,
        wallet_balance: wallet_balance,
        average_rating: reviewStats?.rating || 0,
        total_reviews: reviewStats?.totalReviews || 0,
        total_chat_sessions: todayChatAppointments + todayCallAppointments,
      };
    } else {
      const totalChatAppointments = await this.chatFacade.getExpertSessionCount(
        expert_id as unknown as string,
      );
      const totalCallAppointments = await this.callFacade.getExpertSessionCount(
        expert_id as unknown as string,
      );

      const totalCompleted = await this.chatFacade.getExpertSessionCount(
        expert_id as unknown as string,
        {
          status: 'completed' as unknown as ChatSessionStatus,
        },
      );
      const totalCompletedCalls = await this.callFacade.getExpertSessionCount(
        expert_id as unknown as string,
        {
          status: 'completed' as unknown as CallSessionStatus,
        },
      );

      const totalExpired = await this.chatFacade.getExpertSessionCount(
        expert_id as unknown as string,
        {
          status: ['expired', 'cancelled'] as unknown as ChatSessionStatus[],
        },
      );
      const totalExpiredCalls = await this.callFacade.getExpertSessionCount(
        expert_id as unknown as string,
        {
          status: [
            'expired',
            'cancelled',
            'rejected',
          ] as unknown as CallSessionStatus[],
        },
      );

      const total_earnings = await this.walletFacade.getTotalEarnings(
        expert_id,
        'expert_id',
      );
      const wallet_balance = await this.walletFacade.getBalance(
        expert_id,
        'expert_id',
      );

      return {
        total_appointments: totalChatAppointments + totalCallAppointments,
        total_completed: totalCompleted + totalCompletedCalls,
        total_expired: totalExpired + totalExpiredCalls,
        total_earnings: total_earnings,
        wallet_balance: wallet_balance,
        average_rating: reviewStats?.rating || 0,
        total_reviews: reviewStats?.totalReviews || 0,
        total_chat_sessions: totalChatAppointments + totalCallAppointments,
      };
    }
  }
}
