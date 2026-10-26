import { Inject, Injectable, Optional } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations, expertAccounts, sessions } from '@/core/drizzledb/schema';
import { AvailabilityMode } from '@/core/enums/availability-mode.enum';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { ConsultationOrchestratorService } from '@/internal/consultation/orchestrator/consultation-orchestrator.service';

/**
 * Executes expert logout by revoking authentication sessions in Drizzle,
 * setting the expert availability mode to unavailable, and cleanly
 * terminating any active or pending consultations.
 */
@Injectable()
export class ExpertLogoutUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Optional()
    private readonly consultationOrchestrator?: ConsultationOrchestratorService,
  ) {}

  /**
   * Revokes the expert's session, marks availability offline, and winds down live consultations.
   *
   * @param params - Identifiers for user, expert account, and active session.
   * @param params.userId - Optional User ID to revoke all sessions for.
   * @param params.expertId - Optional Expert account ID to set unavailable and terminate active consultations for.
   * @param params.sessionId - Optional specific session UUID to revoke.
   * @returns Void promise when revocation and teardown have finished.
   */
  async execute(params: {
    userId?: number;
    expertId?: number;
    sessionId?: string;
  }): Promise<void> {
    const { userId, expertId, sessionId } = params;

    if (sessionId) {
      await this.db
        .update(sessions)
        .set({ revoked: true })
        .where(eq(sessions.id, sessionId));
    }

    if (userId) {
      await this.db
        .update(sessions)
        .set({ revoked: true })
        .where(eq(sessions.user_id, userId));
    }

    if (expertId) {
      // Mark expert as unavailable in DB
      await this.db
        .update(expertAccounts)
        .set({ availability_mode: AvailabilityMode.UNAVAILABLE })
        .where(eq(expertAccounts.id, expertId));

      if (this.consultationOrchestrator) {
        const [activeConsultation] = await this.db
          .select({ id: consultations.id })
          .from(consultations)
          .where(
            and(
              eq(consultations.expert_id, expertId),
              inArray(consultations.status, [
                ConsultationStatus.ACTIVE,
                ConsultationStatus.ACCEPTED,
                ConsultationStatus.REQUESTED,
              ]),
            ),
          )
          .limit(1);

        if (activeConsultation) {
          try {
            await this.consultationOrchestrator.end(null, {
              consultationId: activeConsultation.id,
              actorId: expertId,
              actorType: 'expert',
              reason: 'expert_logout',
            });
          } catch {
            // Teardown errors should never fail logout
          }
        }
      }
    }
  }
}
