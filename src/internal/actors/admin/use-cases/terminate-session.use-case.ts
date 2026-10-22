import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations, consultationSessions } from '@/core/drizzledb/schema';
import {
  ConsultationSessionStatus,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { TerminateSessionDto } from '../dto/terminate-session.dto';

/**
 * Handles administrative termination of an active consultation session.
 */
@Injectable()
export class TerminateSessionUseCase {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
  ) {}

  /**
   * Terminates a consultation session by setting status to COMPLETED and recording end timestamp.
   *
   * @param sessionId - Consultation ID to terminate.
   * @param adminId - ID of the admin performing termination.
   * @param dto - User and expert messages explaining reason.
   * @returns Updated consultation record.
   * @throws NotFoundException if consultation does not exist.
   */
  async execute(sessionId: number, adminId: number, dto: TerminateSessionDto) {
    const [consultation] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, sessionId))
      .limit(1);

    if (!consultation) {
      throw new NotFoundException('Consultation session not found');
    }

    if (
      consultation.status === ConsultationStatus.COMPLETED ||
      consultation.status === ConsultationStatus.EXPIRED ||
      consultation.status === ConsultationStatus.CANCELLED
    ) {
      return consultation;
    }

    const now = new Date();

    await this.db.transaction(async (tx) => {
      await tx
        .update(consultations)
        .set({
          status: ConsultationStatus.COMPLETED,
          ended_at: now,
          updated_at: now,
        })
        .where(eq(consultations.id, sessionId));

      await tx
        .update(consultationSessions)
        .set({
          status: ConsultationSessionStatus.COMPLETED,
          ended_at: now,
        })
        .where(
          and(
            eq(consultationSessions.consultation_id, sessionId),
            eq(consultationSessions.status, ConsultationSessionStatus.ACTIVE),
          ),
        );
    });

    return {
      ...consultation,
      status: ConsultationStatus.COMPLETED,
      ended_at: now,
      terminated_by: 'admin',
      adminId,
      reason: dto.userMessage || dto.expertMessage || 'Admin terminated',
    };
  }
}

