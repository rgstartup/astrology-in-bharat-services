import type { DeferredDependency } from '../../../../../shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ChatService } from '../../../../consultation/chat/chat.service';
import { WalletService } from '../../../../finance/wallet/wallet.service';
import { ReviewsService } from '../../../../consultation/reviews/reviews.service';
import { ChatSessionStatus } from '../../../../consultation/chat/enum';
import { CallSessionStatus } from '../../../../consultation/call/enum';
import { CallService } from '../../../../consultation/call/call.service';

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: DeferredDependency<ChatService>,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: DeferredDependency<WalletService>,
    private readonly reviewsService: ReviewsService,
    @Inject(forwardRef(() => CallService))
    private readonly callService: DeferredDependency<CallService>,
  ) {}

  async execute(expertProfileId: number, type: 'today' | 'total' = 'today') {
    if (!expertProfileId) {
      throw new Error('Expert profile ID is required');
    }

    const expert_id = expertProfileId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const reviewStats = await this.reviewsService.getReviewsStats(expert_id);

    if (type === 'today') {
      const todayChatAppointments =
        await this.chatService.getExpertSessionCount(expert_id, {
          startDate: startOfToday,
        });
      const todayCallAppointments =
        await this.callService.getExpertSessionCount(expert_id, {
          startDate: startOfToday,
        });

      const completedToday = await this.chatService.getExpertSessionCount(
        expert_id,
        {
          status: 'completed' as unknown as ChatSessionStatus,
          startDate: startOfToday,
        },
      );
      const completedCallsToday = await this.callService.getExpertSessionCount(
        expert_id,
        {
          status: 'completed' as unknown as CallSessionStatus,
          startDate: startOfToday,
        },
      );

      const expiredToday = await this.chatService.getExpertSessionCount(
        expert_id,
        {
          status: ['expired', 'cancelled'] as unknown as ChatSessionStatus[],
          startDate: startOfToday,
        },
      );
      const expiredCallsToday = await this.callService.getExpertSessionCount(
        expert_id,
        {
          status: [
            'expired',
            'cancelled',
            'rejected',
          ] as unknown as CallSessionStatus[],
          startDate: startOfToday,
        },
      );

      const todayEarnings = await this.walletService.getTotalEarnings(
        expert_id,
        'expert_id',
        {
          startDate: startOfToday,
        },
      );

      const wallet_balance = await this.walletService.getBalance(
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
      const totalChatAppointments =
        await this.chatService.getExpertSessionCount(expert_id);
      const totalCallAppointments =
        await this.callService.getExpertSessionCount(expert_id);

      const totalCompleted = await this.chatService.getExpertSessionCount(
        expert_id,
        {
          status: 'completed' as unknown as ChatSessionStatus,
        },
      );
      const totalCompletedCalls = await this.callService.getExpertSessionCount(
        expert_id,
        {
          status: 'completed' as unknown as CallSessionStatus,
        },
      );

      const totalExpired = await this.chatService.getExpertSessionCount(
        expert_id,
        {
          status: ['expired', 'cancelled'] as unknown as ChatSessionStatus[],
        },
      );
      const totalExpiredCalls = await this.callService.getExpertSessionCount(
        expert_id,
        {
          status: [
            'expired',
            'cancelled',
            'rejected',
          ] as unknown as CallSessionStatus[],
        },
      );

      const total_earnings = await this.walletService.getTotalEarnings(
        expert_id,
        'expert_id',
      );
      const wallet_balance = await this.walletService.getBalance(
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
