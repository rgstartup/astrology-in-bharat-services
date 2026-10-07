import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultationSessions, consultations } from '@/core/drizzledb/schema';
import { ConsultationSessionStatus } from '@/internal/consultation/enums';
import { ConsultationRoomRepository } from './consultation-room.repository';

@Injectable()
export class MarkConsultationSessionStartedUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
  ) {}

  /**
   * First expert join activates the latest pending session and releases the
   * room key. No-op when the consultation/session is unknown or already
   * started — joins are idempotent.
   */
  async execute(consultationId: number, expertId: number) {
    const [consultation] = await this.db
      .select({ id: consultations.id, expert_id: consultations.expert_id })
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1);

    if (!consultation || consultation.expert_id !== expertId) return null;

    const [session] = await this.db
      .select()
      .from(consultationSessions)
      .where(
        and(
          eq(consultationSessions.consultation_id, consultationId),
          eq(consultationSessions.status, ConsultationSessionStatus.PENDING),
        ),
      )
      .orderBy(desc(consultationSessions.id))
      .limit(1);
    if (!session) return null;

    const [started] = await this.db
      .update(consultationSessions)
      .set({
        status: ConsultationSessionStatus.ACTIVE,
        started_at: new Date(),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(consultationSessions.id, session.id),
          isNull(consultationSessions.started_at),
        ),
      )
      .returning();
    await this.rooms.clearRoom(consultationId);
    return started ?? session;
  }
}
