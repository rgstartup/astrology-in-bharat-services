import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, lt } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import {
  ConsultationMode,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { chatRequestTtlSeconds } from '@/internal/consultation/room/consultation-room.repository';
import { rejectChatConsultation } from './chat-request-settlement';
import { RealtimeChatGateway } from './gateways/realtime-chat.gateway';

/**
 * Safety net for unanswered chat requests. Every 10s, CHAT consultations
 * still REQUESTED past the request window go through the shared rejection
 * verdict (REJECTED + `cancelled_at`, wallet hold released, `chat:rejected`
 * to the waiting client). The per-row guarded UPDATE is the multi-instance
 * guard — only the instance that claims a row settles it. Capped per tick.
 */
@Injectable()
export class ChatRequestExpiryCron {
  private readonly logger = new Logger(ChatRequestExpiryCron.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly chatGateway: RealtimeChatGateway,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async expireStaleRequests(): Promise<void> {
    const cutoff = new Date(Date.now() - chatRequestTtlSeconds() * 1000);
    const stale = await this.db
      .select({ id: consultations.id })
      .from(consultations)
      .where(
        and(
          eq(consultations.mode, ConsultationMode.CHAT),
          eq(consultations.status, ConsultationStatus.REQUESTED),
          lt(consultations.requested_at, cutoff),
        ),
      )
      .limit(100);

    for (const row of stale) {
      try {
        await rejectChatConsultation(this.db, this.chatGateway.server, row.id);
      } catch (err) {
        this.logger.error(
          `[ChatExpiry] Settlement failed for ${row.id}: ${(err as Error).message}`,
        );
      }
    }
  }
}
