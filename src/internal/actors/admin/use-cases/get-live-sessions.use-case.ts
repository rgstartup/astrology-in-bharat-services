import { Injectable, Inject } from '@nestjs/common';
import { count, desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  consultations,
  clientAccounts,
  expertAccounts,
  users,
} from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { GetLiveSessionsDto } from '../dto/get-live-sessions.dto';

/**
 * Retrieves paginated live and historical consultation sessions for admin oversight.
 */
@Injectable()
export class GetLiveSessionsUseCase {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
  ) {}

  /**
   * Fetches paginated sessions with client and expert summaries.
   *
   * @param dto - Pagination and session filter options.
   * @returns Object containing items list and total count.
   */
  async execute(dto: GetLiveSessionsDto) {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
    const offset = (page - 1) * limit;

    let statusCondition = undefined;
    if (dto.type === 'chat_live') {
      statusCondition = eq(consultations.status, ConsultationStatus.ACTIVE);
    } else if (dto.type === 'expired') {
      statusCondition = inArray(consultations.status, [
        ConsultationStatus.EXPIRED,
        ConsultationStatus.COMPLETED,
      ]);
    } else if (dto.type === 'admin_terminated') {
      statusCondition = eq(consultations.status, ConsultationStatus.COMPLETED);
    }

    const whereClause = statusCondition;

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(consultations)
      .where(whereClause);

    const total = Number(totalRow?.value ?? 0);

    const rows = await this.db
      .select({
        id: consultations.id,
        status: consultations.status,
        mode: consultations.mode,
        durationSeconds: consultations.duration_seconds,
        startedAt: consultations.started_at,
        endedAt: consultations.ended_at,
        createdAt: consultations.created_at,
        clientId: consultations.client_id,
        clientName: users.name,
        clientEmail: users.email,
        expertId: consultations.expert_id,
        expertSpecialization: expertAccounts.specialization,
      })
      .from(consultations)
      .leftJoin(clientAccounts, eq(consultations.client_id, clientAccounts.id))
      .leftJoin(users, eq(clientAccounts.user_id, users.id))
      .leftJoin(expertAccounts, eq(consultations.expert_id, expertAccounts.id))
      .where(whereClause)
      .orderBy(desc(consultations.created_at))
      .limit(limit)
      .offset(offset);

    const items = rows.map((r) => ({
      id: r.id,
      status: r.status,
      mode: r.mode,
      duration_seconds: r.durationSeconds,
      started_at: r.startedAt,
      end_time: r.endedAt,
      created_at: r.createdAt,
      client: {
        id: r.clientId,
        user: {
          name: r.clientName || '',
          email: r.clientEmail || '',
        },
      },
      expert: {
        id: r.expertId,
        specialization: r.expertSpecialization || '',
      },
      message_count: 0,
    }));

    return { items, total };
  }
}

