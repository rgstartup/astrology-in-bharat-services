import { Injectable, Inject } from '@nestjs/common';
import { and, count, desc, eq, inArray, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  consultations,
  consultationBillings,
  consultationSessions,
  clientAccounts,
  expertAccounts,
  users,
  reviews,
} from '@/core/drizzledb/schema';
import {
  ConsultationMode,
  ConsultationStatus as DrizzleConsultationStatus,
} from '@/internal/consultation/enums';
import {
  ConsultationHistoryDto,
  ConsultationExpertDto,
} from '../dto/consultation-history.dto';
import { ConsultationType, ConsultationStatus } from '../enum';
import { GetUnifiedHistoryDto } from '../dto/get-unified-history.dto';

const clientUsers = alias(users, 'client_users');
const expertUsers = alias(users, 'expert_users');

/**
 * Retrieves unified consultation history across chat, voice, and video modes.
 */
@Injectable()
export class GetUnifiedHistoryUseCase {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
  ) {}

  /**
   * Fetches paginated consultation history for client or expert.
   *
   * @param profileId - ID of the client or expert profile.
   * @param isExpert - Whether the requester is an expert.
   * @param dto - Pagination and search filters.
   * @returns Paginated consultation history items and total count.
   */
  async execute(
    profileId: number,
    isExpert: boolean,
    dto: GetUnifiedHistoryDto,
  ): Promise<{ data: ConsultationHistoryDto[]; totalCount: number }> {
    const limitNum = Math.min(Math.max(1, dto.limit ?? 20), 100);
    const offsetNum = Math.max(0, dto.offset ?? 0);
    const search = dto.search?.trim();

    const whereConditions = [
      isExpert
        ? eq(consultations.expert_id, profileId)
        : eq(consultations.client_id, profileId),
    ];

    if (search) {
      const cleanSearch = search.replace(/^AIB-(CHAT|VID|CALL)-/i, '');
      const searchNum = Number(cleanSearch);
      if (!Number.isNaN(searchNum)) {
        whereConditions.push(eq(consultations.id, searchNum));
      }
    }

    const whereClause = and(...whereConditions);

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(consultations)
      .where(whereClause);

    const totalCount = Number(totalRow?.value ?? 0);

    if (totalCount === 0) {
      return { data: [], totalCount: 0 };
    }

    const rows = await this.db
      .select({
        id: consultations.id,
        clientId: consultations.client_id,
        expertId: consultations.expert_id,
        mode: consultations.mode,
        status: consultations.status,
        durationSeconds: consultations.duration_seconds,
        startedAt: consultations.started_at,
        endedAt: consultations.ended_at,
        createdAt: consultations.created_at,
        clientAvatar: clientAccounts.avatar,
        clientUserName: clientUsers.name,
        clientUserAvatar: clientUsers.avatar,
        expertName: expertAccounts.name,
        expertAvatar: expertAccounts.avatar,
        expertSpecialization: expertAccounts.specialization,
        expertUserName: expertUsers.name,
        expertUserAvatar: expertUsers.avatar,
        grossEarning: consultationBillings.gross_earning,
        platformFee: consultationBillings.platform_fee,
        tax: consultationBillings.tax,
        ratePerMinute: consultationBillings.rate_per_minute,
        netPayable: consultationBillings.net_payable,
      })
      .from(consultations)
      .leftJoin(clientAccounts, eq(consultations.client_id, clientAccounts.id))
      .leftJoin(clientUsers, eq(clientAccounts.user_id, clientUsers.id))
      .leftJoin(expertAccounts, eq(consultations.expert_id, expertAccounts.id))
      .leftJoin(expertUsers, eq(expertAccounts.user_id, expertUsers.id))
      .leftJoin(
        consultationBillings,
        eq(consultations.id, consultationBillings.consultation_id),
      )
      .where(whereClause)
      .orderBy(desc(consultations.created_at))
      .limit(limitNum)
      .offset(offsetNum);

    const consultationIds = rows.map((r) => r.id);

    // Fetch consultation session IDs to correlate reviews
    const sessionRows = await this.db
      .select({
        id: consultationSessions.id,
        consultationId: consultationSessions.consultation_id,
      })
      .from(consultationSessions)
      .where(inArray(consultationSessions.consultation_id, consultationIds));

    const sessionIdToConsultationId = new Map<number, number>();
    const sessionIds: number[] = [];
    for (const s of sessionRows) {
      sessionIdToConsultationId.set(s.id, s.consultationId);
      sessionIds.push(s.id);
    }

    const searchReviewIds = [...sessionIds, ...consultationIds];
    const reviewRows =
      searchReviewIds.length > 0
        ? await this.db
            .select({
              rating: reviews.rating,
              comment: reviews.comment,
              sessionId: reviews.session_id,
              callSessionId: reviews.call_session_id,
            })
            .from(reviews)
            .where(
              or(
                inArray(reviews.session_id, searchReviewIds),
                inArray(reviews.call_session_id, searchReviewIds),
              ),
            )
        : [];

    const consultationReviewMap = new Map<
      number,
      { rating: number; comment?: string }
    >();
    for (const rev of reviewRows) {
      const cId =
        (rev.sessionId ? sessionIdToConsultationId.get(rev.sessionId) : null) ??
        rev.sessionId ??
        rev.callSessionId;
      if (cId && !consultationReviewMap.has(cId)) {
        consultationReviewMap.set(cId, {
          rating: Number(rev.rating),
          comment: rev.comment ?? undefined,
        });
      }
    }

    const data: ConsultationHistoryDto[] = rows.map((row) => {
      const mode = row.mode as ConsultationMode;
      const type = this.mapModeToType(mode);
      const displayId = this.getDisplayId(row.id, mode);
      const duration = row.durationSeconds || 0;
      const totalCost = Number(row.grossEarning || 0);
      const platformFee = Number(row.platformFee || 0);
      const gst = Number(row.tax || 0);
      const expertEarning = Number(row.netPayable || 0);
      const rate = Number(row.ratePerMinute || 0);
      const review = consultationReviewMap.get(row.id);

      const expertImage =
        row.expertUserAvatar ||
        row.expertAvatar ||
        '/images/dummy-astrologer.jpg';
      const userImage =
        row.clientAvatar ||
        row.clientUserAvatar ||
        '/images/dummy-user.jpg';
      const expertName = row.expertName || row.expertUserName || 'Expert';
      const expertCategory = row.expertSpecialization || 'Astrologer';
      const userName = row.clientUserName || 'Client';

      const expert: ConsultationExpertDto = {
        id: row.expertId,
        name: expertName,
        profile_image: expertImage,
      };

      return {
        id: row.id,
        displayId,
        type,
        status: this.mapStatus(row.status, duration),
        startTime: row.startedAt || row.createdAt,
        endTime: row.endedAt,
        duration,
        durationString: this.formatDuration(duration),
        terminatedBy: undefined,
        terminatedReason: 'Normal Closure',
        total_cost: Math.round(totalCost * 100) / 100,
        platform_fee: Math.round(platformFee * 100) / 100,
        gst: Math.round(gst * 100) / 100,
        agent_commission: 0,
        expert_earning: Math.round(expertEarning * 100) / 100,
        amount: Math.round(totalCost * 100) / 100,
        rate: Math.round(rate * 100) / 100,
        rating: review?.rating || 0,
        comment: review?.comment,
        expert_image: expertImage,
        user_image: userImage,
        expert_name: expertName,
        expert_category: expertCategory,
        user_name: userName,
        expert,
        metadata: {},
      };
    });

    return {
      data,
      totalCount,
    };
  }

  private mapModeToType(mode: ConsultationMode): ConsultationType {
    switch (mode) {
      case ConsultationMode.CHAT:
        return ConsultationType.CHAT;
      case ConsultationMode.AUDIO_CALL:
        return ConsultationType.AUDIO_CALL;
      case ConsultationMode.VIDEO_CALL:
        return ConsultationType.VIDEO_CALL;
      default:
        return ConsultationType.CHAT;
    }
  }

  private getDisplayId(id: number, mode: ConsultationMode): string {
    switch (mode) {
      case ConsultationMode.VIDEO_CALL:
        return `AIB-VID-${id}`;
      case ConsultationMode.AUDIO_CALL:
        return `AIB-CALL-${id}`;
      case ConsultationMode.CHAT:
      default:
        return `AIB-CHAT-${id}`;
    }
  }

  private mapStatus(
    status: DrizzleConsultationStatus,
    duration: number = 0,
  ): ConsultationStatus {
    if (status === DrizzleConsultationStatus.COMPLETED && duration === 0) {
      return ConsultationStatus.MISSED;
    }

    switch (status) {
      case DrizzleConsultationStatus.COMPLETED:
        return ConsultationStatus.COMPLETED;
      case DrizzleConsultationStatus.CANCELLED:
        return ConsultationStatus.CANCELLED;
      case DrizzleConsultationStatus.REJECTED:
        return ConsultationStatus.REJECTED;
      case DrizzleConsultationStatus.EXPIRED:
        return ConsultationStatus.MISSED;
      case DrizzleConsultationStatus.REQUESTED:
      case DrizzleConsultationStatus.ACCEPTED:
        return ConsultationStatus.PENDING;
      case DrizzleConsultationStatus.ACTIVE:
        return ConsultationStatus.ACTIVE;
      default:
        return ConsultationStatus.COMPLETED;
    }
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }
}
