import { Inject, Injectable, Optional } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { consultations, sessions } from "@/core/drizzledb/schema";
import { ConsultationStatus } from "@/internal/consultation/enums";
import { ConsultationOrchestratorService } from "@/internal/consultation/orchestrator/consultation-orchestrator.service";

/**
 * Executes client logout by revoking authentication sessions in Drizzle
 * and cleanly terminating any active or pending consultations.
 */
@Injectable()
export class ClientLogoutUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Optional()
    private readonly consultationOrchestrator?: ConsultationOrchestratorService,
  ) {}

  /**
   * Revokes the client's session and winds down live consultations.
   *
   * @param params - Identifiers for user, client account, and active session.
   * @param params.userId - Optional User ID to revoke all sessions for.
   * @param params.clientId - Optional Client account ID to terminate active consultations for.
   * @param params.sessionId - Optional specific session UUID to revoke.
   * @returns Void promise when revocation and teardown have finished.
   */
  async execute(params: {
    userId?: number;
    clientId?: number;
    sessionId?: string;
  }): Promise<void> {
    const { userId, clientId, sessionId } = params;

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

    if (clientId && this.consultationOrchestrator) {
      const [activeConsultation] = await this.db
        .select({ id: consultations.id })
        .from(consultations)
        .where(
          and(
            eq(consultations.client_id, clientId),
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
            actorId: clientId,
            actorType: "client",
            reason: "client_logout",
          });
        } catch {
          // Teardown errors should never fail logout
        }
      }
    }
  }
}
