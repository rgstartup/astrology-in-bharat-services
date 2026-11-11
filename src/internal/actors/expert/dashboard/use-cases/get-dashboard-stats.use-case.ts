import type { DeferredDependency } from '@/shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { and, count, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { WalletService } from '@/internal/finance/wallet/wallet.service';
import { ExpertReviewsService } from '@/internal/actors/expert/consultation/reviews/expert-reviews.service';
import { StatsPeriod } from '@/shared/dto/stats-period.dto';

/**
 * Computes dashboard statistics for an expert across daily, weekly, monthly,
 * or yearly periods, with optional explicit date range override.
 */
@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: DeferredDependency<WalletService>,
    private readonly expertReviewsService: ExpertReviewsService,
  ) {}

  /**
   * Generates consultation metrics, earnings, and ratings for the expert dashboard.
   *
   * @param expertProfileId - Expert account ID.
   * @param period - Reporting timeframe ('daily' | 'weekly' | 'monthly' | 'yearly').
   * @param startDate - Optional explicit start date (ISO string).
   * @param endDate - Optional explicit end date (ISO string).
   * @returns Aggregated statistics.
   */
  async execute(
    expertProfileId: number,
    period?: StatsPeriod,
    startDate?: string,
    endDate?: string,
  ) {
    if (!expertProfileId) {
      throw new Error('Expert profile ID is required');
    }

    const expert_id = expertProfileId;

    // Resolve effective date range
    let rangeStart: Date;
    let rangeEnd: Date = new Date();
    let isToday = false;

    if (startDate && endDate) {
      rangeStart = new Date(startDate);
      rangeEnd = new Date(endDate);
      rangeEnd.setHours(23, 59, 59, 999);
    } else {
      const p = period ?? StatsPeriod.MONTHLY;
      rangeEnd = new Date();
      rangeEnd.setHours(23, 59, 59, 999);

      switch (p) {
        case StatsPeriod.DAILY:
          rangeStart = new Date();
          rangeStart.setHours(0, 0, 0, 0);
          isToday = true;
          break;
        case StatsPeriod.WEEKLY:
          rangeStart = new Date();
          rangeStart.setDate(rangeStart.getDate() - 6);
          rangeStart.setHours(0, 0, 0, 0);
          break;
        case StatsPeriod.YEARLY:
          rangeStart = new Date();
          rangeStart.setMonth(rangeStart.getMonth() - 12);
          rangeStart.setHours(0, 0, 0, 0);
          break;
        case StatsPeriod.MONTHLY:
        default:
          rangeStart = new Date();
          rangeStart.setMonth(rangeStart.getMonth() - 1);
          rangeStart.setHours(0, 0, 0, 0);
          break;
      }
    }

    const reviewStats = await this.expertReviewsService.getExpertReviewsStats(expert_id);

    const conditions = [
      eq(consultations.expert_id, expert_id),
      gte(consultations.created_at, rangeStart),
      lte(consultations.created_at, rangeEnd),
    ];

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

    if (isToday || (startDate && endDate && rangeStart.getDate() === rangeEnd.getDate())) {
      const todayEarnings = await this.walletService.getTotalEarnings(
        expert_id,
        'expert_id',
        {
          startDate: rangeStart,
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

