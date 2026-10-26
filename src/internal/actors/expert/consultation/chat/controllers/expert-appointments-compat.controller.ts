import {
  Controller,
  Get,
  Header,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  clientAccounts,
  consultations,
  users,
} from '@/core/drizzledb/schema';
import {
  ConsultationMode,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { JwtAuthGuard } from '@/internal/auth/guards/auth.guard';
import { CurrentProfile } from '@/shared/decorators/current-profile.decorator';

/**
 * Backward compatibility controller for legacy expert appointments polling.
 * Preserves `/v1/chat/sessions/appointments/*` and `/v1/call/sessions/appointments/*`.
 */
@Controller({
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ExpertAppointmentsCompatController {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
  ) {}

  /**
   * Retrieves recent pending chat appointments for expert dashboard.
   *
   * @param profileId - Profile ID of current expert.
   * @returns Paginated list of pending chat sessions.
   */
  @Get('chat/sessions/appointments/pending')
  @Header('Cache-Control', 'no-store')
  async getRecentPendingChatSessions(@CurrentProfile() profileId: number) {
    return this.getSessions(
      profileId,
      [ConsultationMode.CHAT],
      [ConsultationStatus.REQUESTED, ConsultationStatus.ACCEPTED],
    );
  }

  /**
   * Retrieves recent completed chat appointments for expert dashboard.
   *
   * @param profileId - Profile ID of current expert.
   * @returns Paginated list of completed chat sessions.
   */
  @Get('chat/sessions/appointments/completed')
  @Header('Cache-Control', 'no-store')
  async getRecentCompletedChatSessions(@CurrentProfile() profileId: number) {
    return this.getSessions(
      profileId,
      [ConsultationMode.CHAT],
      [ConsultationStatus.COMPLETED],
    );
  }

  /**
   * Retrieves recent pending voice/video call appointments for expert dashboard.
   *
   * @param profileId - Profile ID of current expert.
   * @returns Paginated list of pending call sessions.
   */
  @Get('call/sessions/appointments/pending')
  @Header('Cache-Control', 'no-store')
  async getRecentPendingCallSessions(@CurrentProfile() profileId: number) {
    return this.getSessions(
      profileId,
      [ConsultationMode.VOICE, ConsultationMode.VIDEO],
      [ConsultationStatus.REQUESTED, ConsultationStatus.ACCEPTED],
    );
  }

  /**
   * Retrieves recent completed voice/video call appointments for expert dashboard.
   *
   * @param profileId - Profile ID of current expert.
   * @returns Paginated list of completed call sessions.
   */
  @Get('call/sessions/appointments/completed')
  @Header('Cache-Control', 'no-store')
  async getRecentCompletedCallSessions(@CurrentProfile() profileId: number) {
    return this.getSessions(
      profileId,
      [ConsultationMode.VOICE, ConsultationMode.VIDEO],
      [ConsultationStatus.COMPLETED],
    );
  }

  private async getSessions(
    expertId: number,
    modes: ConsultationMode[],
    statuses: ConsultationStatus[],
  ) {
    const rows = await this.db
      .select({
        id: consultations.id,
        status: consultations.status,
        mode: consultations.mode,
        durationSeconds: consultations.duration_seconds,
        createdAt: consultations.created_at,
        startedAt: consultations.started_at,
        endedAt: consultations.ended_at,
        clientId: consultations.client_id,
        clientName: users.name,
        clientEmail: users.email,
        clientAvatar: clientAccounts.avatar,
      })
      .from(consultations)
      .leftJoin(clientAccounts, eq(consultations.client_id, clientAccounts.id))
      .leftJoin(users, eq(clientAccounts.user_id, users.id))
      .where(
        and(
          eq(consultations.expert_id, expertId),
          inArray(consultations.mode, modes),
          inArray(consultations.status, statuses),
        ),
      )
      .orderBy(desc(consultations.created_at))
      .limit(20);

    const data = rows.map((r) => {
      const mode = r.mode as ConsultationMode;
      const type =
        mode === ConsultationMode.VIDEO
          ? 'VIDEO'
          : mode === ConsultationMode.VOICE
            ? 'AUDIO'
            : 'CHAT';

      return {
        id: r.id,
        status: r.status.toLowerCase(),
        mode: r.mode,
        type,
        created_at: r.createdAt,
        createdAt: r.createdAt,
        start_time: r.startedAt,
        end_time: r.endedAt,
        duration_seconds: r.durationSeconds,
        client_id: r.clientId,
        client: {
          id: r.clientId,
          name: r.clientName || 'Client',
          avatar: r.clientAvatar,
          user: {
            name: r.clientName || 'Client',
            email: r.clientEmail,
            avatar: r.clientAvatar,
          },
        },
        user: {
          name: r.clientName || 'Client',
          email: r.clientEmail,
          avatar: r.clientAvatar,
        },
      };
    });

    return {
      success: true,
      data,
      meta: { totalCount: data.length, limit: 20, offset: 0 },
    };
  }
}
