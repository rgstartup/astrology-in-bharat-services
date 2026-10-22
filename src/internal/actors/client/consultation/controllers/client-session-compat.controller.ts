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
  consultations,
  expertAccounts,
} from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { JwtAuthGuard } from '@/internal/auth/guards/auth.guard';
import { CurrentProfile } from '@/shared/decorators/current-profile.decorator';

/**
 * Backward compatibility controller for client polling active session.
 * Preserves `/v1/chat/sessions/active-client`.
 */
@Controller({
  path: 'chat',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ClientSessionCompatController {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
  ) {}

  /**
   * Retrieves current active consultation session for client.
   *
   * @param clientId - Client profile ID.
   * @returns Active session payload or null.
   */
  @Get('sessions/active-client')
  @Header('Cache-Control', 'no-store')
  async getActiveClientSession(@CurrentProfile() clientId: number) {
    const [row] = await this.db
      .select({
        id: consultations.id,
        status: consultations.status,
        expert_id: consultations.expert_id,
        expertName: expertAccounts.name,
      })
      .from(consultations)
      .leftJoin(expertAccounts, eq(consultations.expert_id, expertAccounts.id))
      .where(
        and(
          eq(consultations.client_id, clientId),
          inArray(consultations.status, [
            ConsultationStatus.REQUESTED,
            ConsultationStatus.ACCEPTED,
            ConsultationStatus.ACTIVE,
          ]),
        ),
      )
      .orderBy(desc(consultations.created_at))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      consultationId: row.id,
      consultation_id: row.id,
      expertId: row.expert_id,
      expert_id: row.expert_id,
      status: row.status.toLowerCase(),
      expert: {
        id: row.expert_id,
        user: {
          name: row.expertName || 'Expert',
        },
      },
    };
  }
}
