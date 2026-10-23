import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultationSessions, consultations } from '@/core/drizzledb/schema';
import {
  ConsultationMode,
  ConsultationSessionStatus,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { ConsultationBudgetEngine } from '../consultation-budget.engine';
import { ConsultationRoomRepository } from '@/internal/consultation/room/consultation-room.repository';
import { ChatModeAdapter } from '../adapters/chat-mode.adapter';
import {
  ConsultationStatePayload,
  SwitchToChatCommand,
  toConsultationModeType,
} from '../consultation-orchestrator.types';
import {
  ConsultationAlreadyInChatModeError,
  ConsultationNotFoundError,
  ConsultationNotOwnerError,
  ConsultationNotSwitchableError,
} from '../errors';

/**
 * Moves a live voice/video consultation over to chat.
 *
 * Responsibilities:
 * - Close the running voice/video `consultation_sessions` row and open a NEW
 *   chat session row, so every message sent afterwards is stored in that
 *   session (`resolveMessageSessionId` picks the newest ACTIVE session).
 * - Flip `consultations.mode` to `CHAT` and re-point the metered mode in Redis
 *   so billing switches to the chat rate.
 * - Carry the seconds already consumed over to the chat session by
 *   re-anchoring the budget clock instead of restarting it.
 */
@Injectable()
export class SwitchToChatUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly budget: ConsultationBudgetEngine,
    private readonly rooms: ConsultationRoomRepository,
    private readonly chatAdapter: ChatModeAdapter,
  ) {}

  /**
   * Executes the voice/video -> chat switch.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param command - Command containing the consultation id and the acting client.
   * @returns Object containing the switch status, the new chat session id, and the state payload.
   * @throws ConsultationNotFoundError If the consultation does not exist.
   * @throws ConsultationNotOwnerError If the acting client does not own the consultation.
   * @throws ConsultationAlreadyInChatModeError If the consultation already runs over chat.
   * @throws ConsultationNotSwitchableError If the consultation is no longer running.
   */
  async execute(server: Server, command: SwitchToChatCommand) {
    const [row] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, command.consultationId))
      .limit(1);

    if (!row) {
      throw new ConsultationNotFoundError(command.consultationId);
    }
    if (row.client_id !== command.actorId) {
      throw new ConsultationNotOwnerError(command.consultationId);
    }

    const mode = toConsultationModeType(row.mode);
    if (mode === 'chat') {
      throw new ConsultationAlreadyInChatModeError(row.id, mode);
    }
    const switchableStatuses: ConsultationStatus[] = [
      ConsultationStatus.REQUESTED,
      ConsultationStatus.ACCEPTED,
      ConsultationStatus.ACTIVE,
    ];
    if (!switchableStatuses.includes(row.status)) {
      throw new ConsultationNotSwitchableError(row.id, mode, row.status);
    }

    const isLive = row.status === ConsultationStatus.ACTIVE;
    const now = new Date();

    // Seconds already burned at the voice/video rate stay burned. A dialog
    // hold froze them above: release it now so the chat clock can re-anchor.
    const before = await this.budget.calculateAffordability(row.id, mode);
    const elapsedSeconds = before?.elapsedSeconds ?? 0;
    await this.rooms.clearBillingHold(row.id);

    const sessionId = await this.db.transaction(async (tx) => {
      // The running call session is closed; its messages stay in that session.
      await tx
        .update(consultationSessions)
        .set({
          status: ConsultationSessionStatus.COMPLETED,
          ended_at: now,
          updated_at: now,
        })
        .where(
          and(
            eq(consultationSessions.consultation_id, row.id),
            eq(consultationSessions.status, ConsultationSessionStatus.ACTIVE),
          ),
        );

      if (isLive) {
        // A running consultation needs a fresh ACTIVE chat session, so that
        // `resolveMessageSessionId` stores the new messages in it.
        const [inserted] = await tx
          .insert(consultationSessions)
          .values({
            consultation_id: row.id,
            mode: ConsultationMode.CHAT,
            status: ConsultationSessionStatus.ACTIVE,
            started_at: now,
            created_at: now,
            updated_at: now,
          })
          .returning();
        return inserted?.id ?? null;
      }

      // A consultation that has not started yet only needs its session
      // converted; it becomes the chat session once the expert accepts.
      const [pendingSession] = await tx
        .select()
        .from(consultationSessions)
        .where(
          and(
            eq(consultationSessions.consultation_id, row.id),
            eq(consultationSessions.status, ConsultationSessionStatus.PENDING),
          ),
        )
        .orderBy(desc(consultationSessions.id))
        .limit(1);

      if (pendingSession) {
        const [updated] = await tx
          .update(consultationSessions)
          .set({ mode: ConsultationMode.CHAT, updated_at: now })
          .where(eq(consultationSessions.id, pendingSession.id))
          .returning();
        return updated?.id ?? pendingSession.id;
      }

      const [inserted] = await tx
        .insert(consultationSessions)
        .values({
          consultation_id: row.id,
          mode: ConsultationMode.CHAT,
          status: ConsultationSessionStatus.PENDING,
          created_at: now,
          updated_at: now,
        })
        .returning();
      return inserted?.id ?? null;
    });

    await this.db
      .update(consultations)
      .set({ mode: ConsultationMode.CHAT, updated_at: now })
      .where(eq(consultations.id, row.id));

    // Metered mode -> chat rate, and the clock keeps running from the seconds
    // already consumed.
    await this.chatAdapter.onStart(row.id, { id: sessionId });
    await this.chatAdapter.onResume(row.id, {
      anchorIso: now.toISOString(),
      baseSeconds: elapsedSeconds,
    });

    const affordability = await this.budget.calculateAffordability(
      row.id,
      'chat',
    );
    const state = isLive
      ? 'active'
      : row.status === ConsultationStatus.ACCEPTED
        ? 'accepted'
        : 'requested';

    const payload: ConsultationStatePayload = {
      consultationId: row.id,
      mode: 'chat',
      state,
      startedAt: affordability?.startedAt ?? now.toISOString(),
      elapsedSeconds: affordability?.elapsedSeconds ?? elapsedSeconds,
      maxMinutes: affordability?.maxMinutes ?? 0,
      ratePerMinute: affordability?.ratePerMinute ?? 0,
      timestamp: now.toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.STATE, payload);
    server
      .to(SOCKET_ROOMS.EXPERT(row.expert_id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.STATE, payload);
    if (isLive) {
      // Clear any dialog-hold pause state on both sides: the chat clock is live.
      server
        .to(SOCKET_ROOMS.CONSULTATION(row.id))
        .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED, payload);
    }

    return {
      status: 'switched_to_chat',
      consultationId: row.id,
      sessionId,
      payload,
    };
  }
}
