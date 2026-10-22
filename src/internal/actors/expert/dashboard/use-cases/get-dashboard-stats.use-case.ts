import type { DeferredDependency } from '@/shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { and, count, eq, gte, inArray, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { WalletService } from '@/internal/finance/wallet/wallet.service';
import { ReviewsService } from '@/internal/consultation/reviews/reviews.service';

/**
 * Computes dashboard statistics for an expert across daily or all-time periods.
 */
@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: DeferredDependency<WalletService>,
    private readonly reviewsService: ReviewsService,
  ) {}

  /**
   * Generates consultation metrics, earnings, and ratings for the expert dashboard.
   *
   * @param expertProfileId - Expert account ID.
   * @param type - Reporting timeframe ('today' | 'total').
   * @returns Aggregated statistics.
   */
  async execute(expertProfileId: number, type: 'today' | 'total' = 'today') {
    if (!expertProfileId) {
      throw new Error('Expert profile ID is required');
    }

    const expert_id = expertProfileId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const reviewStats = await this.reviewsService.getReviewsStats(expert_id);

    const isToday = type === 'today';

    const conditions = [eq(consultations.expert_id, expert_id)];
    if (isToday) {
      conditions.push(gte(consultations.created_at, startOfToday));
    }

    const [stats] = await this.db
      .select({
        totalAppointments: count(),
        completed: sql<number>`count(*) filter (where ${eq(consultations.status, ConsultationStatus.COMPLETED)})`,
        expired: sql<number>`count(*) filter (where ${inArray(consultations.status, [
          ConsultationStatus.EXPIRED,
          ConsultationStatus.CANCELLED,
          ConsultationStatus.REJECTED,
        ])})`,
      })
      .from(consultations)
      .where(and(...conditions));

    const totalAppointments = Number(stats?.totalAppointments ?? 0);
    const completedCount = Number(stats?.completed ?? 0);
    const expiredCount = Number(stats?.expired ?? 0);

    if (isToday) {
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
        today_appointments: totalAppointments,
        completed_today: completedCount,
        expired_today: expiredCount,
        today_earnings: todayEarnings,
        wallet_balance: wallet_balance,
        average_rating: reviewStats?.rating || 0,
        total_reviews: reviewStats?.totalReviews || 0,
        total_chat_sessions: totalAppointments,
      };
    } else {
      const total_earnings = await this.walletService.getTotalEarnings(
        expert_id,
        'expert_id',
      );
      const wallet_balance = await this.walletService.getBalance(
        expert_id,
        'expert_id',
      );

      return {
        total_appointments: totalAppointments,
        total_completed: completedCount,
        total_expired: expiredCount,
        total_earnings: total_earnings,
        wallet_balance: wallet_balance,
        average_rating: reviewStats?.rating || 0,
        total_reviews: reviewStats?.totalReviews || 0,
        total_chat_sessions: totalAppointments,
      };
    }
  }
}

