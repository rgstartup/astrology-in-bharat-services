import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultationSessions, consultations } from '@/core/drizzledb/schema';
import { ConsultationSessionStatus } from '@/internal/consultation/enums';
import { ConsultationMode } from '@/internal/consultation/enums';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import {
  persistChatMessage,
  resolveMessageSessionId,
  toMessageType,
} from '@/internal/realtime/chat/chat-message-persistence';
import {
  isConsultationParticipant,
  resolveConsultationClientName,
} from '@/internal/realtime/room/consultation-room-access';
import { ConsultationRoomRepository } from '@/internal/consultation/room/consultation-room.repository';
import {
  CONSULTATION_ACK_STATUS,
  type ConsultationAckStatus,
} from '@/internal/realtime/constants/consultation-ack-status.constant';
import type { AuthenticatedSocketIdentity } from '@/internal/realtime/types/socket-auth.types';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';

import { ConsultationOrchestratorService } from '@/internal/consultation/orchestrator/consultation-orchestrator.service';

export interface ClientChatPauseAck {
  status: ConsultationAckStatus;
  consultationId: number;
  elapsedSeconds?: number;
  consumedAmount?: number;
  maxMinutes?: number;
  mode?: ConsultationMode;
}

export interface ClientChatResumeAck {
  status: ConsultationAckStatus;
  consultationId: number;
  maxMinutes?: number;
  startedAt?: string | null;
  mode?: ConsultationMode;
}

interface ChatMessageInput {
  consultationId: number;
  content: string;
  attachmentMediaId?: number;
  attachmentUrl?: string;
  attachmentType?: string;
}

@Injectable()
export class ClientChatHandler {
  private readonly logger = new Logger(ClientChatHandler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
    private readonly orchestrator: ConsultationOrchestratorService,
  ) {}

  async sendChatMessage(
    server: Server,
    socket: RealtimeSocket,
    input: ChatMessageInput,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{
    status: ConsultationAckStatus;
    message: Record<string, unknown>;
  }> {
    if (!(await isConsultationParticipant(this.db, input.consultationId, identity))) {
      return { status: CONSULTATION_ACK_STATUS.IGNORED, message: {} };
    }
    const room = SOCKET_ROOMS.CONSULTATION(input.consultationId);
    // Membership self-repair: a socket silently out of the room still gets
    // its own echo but misses the other side — rejoin before emitting.
    await socket.join(room);
    // Balance-pause gate: no new messages while the client is recharging.
    if (await this.rooms.isPaused(input.consultationId)) {
      return { status: CONSULTATION_ACK_STATUS.IGNORED, message: {} };
    }
    // Foolproof backstop: a send past zero pauses first (all sides get
    // `consultation:paused`) and the message itself is dropped.
    const budget = await this.orchestrator.getStatus(input.consultationId);
    if (
      budget &&
      (budget.remainingSeconds ?? 0) <= 0 &&
      budget.ratePerMinute > 0
    ) {
      await this.orchestrator.triggerBudgetHold(server, input.consultationId);
      return { status: CONSULTATION_ACK_STATUS.IGNORED, message: {} };
    }
    const senderId =
      identity.actorType === 'expert' ? identity.expertId : identity.clientId;
    const persisted = await persistChatMessage(this.db, {
      consultationId: input.consultationId,
      sessionId: await resolveMessageSessionId(this.db, input.consultationId),
      senderId,
      senderType: identity.actorType,
      content: input.content,
      messageType: toMessageType(input.attachmentType),
      mediaId: input.attachmentMediaId,
    });
    const messagePayload = {
      id: persisted.id,
      consultationId: input.consultationId,
      senderId,
      senderType: identity.actorType,
      content: input.content,
      attachments: persisted.attachments,
      attachmentUrl: input.attachmentUrl,
      attachmentType: input.attachmentType,
      timestamp: persisted.createdAt.toISOString(),
      sessionId: persisted.sessionId,
    };

    socket.to(room).emit(SOCKET_EVENTS.CHAT.MESSAGE, messagePayload);
    socket.emit(SOCKET_EVENTS.CHAT.MESSAGE, messagePayload);

    return { status: CONSULTATION_ACK_STATUS.SENT, message: messagePayload };
  }

  relayChatTyping(
    socket: RealtimeSocket,
    consultationId: number,
    isTyping: boolean,
    identity: AuthenticatedSocketIdentity,
  ): void {
    const room = SOCKET_ROOMS.CONSULTATION(consultationId);
    socket.to(room).emit(SOCKET_EVENTS.CHAT.TYPING, {
      consultationId,
      senderId: identity.id,
      senderType: identity.actorType,
      isTyping,
    });
  }

  /** Client chat request → forward as `chat:incoming` to the expert's room. Ack confirms delivery. */
  async requestChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    expertId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: ConsultationAckStatus; consultationId: number }> {
    const room = SOCKET_ROOMS.CONSULTATION(consultationId);
    await socket.join(room);
    // Fresh request cycle: drop any stale pause gate / resume anchor.
    await this.rooms.clearPaused(consultationId);
    await this.rooms.clearAnchor(consultationId);
    const [session] = await this.db
      .select({ id: consultationSessions.id })
      .from(consultationSessions)
      .where(
        and(
          eq(consultationSessions.consultation_id, consultationId),
          eq(consultationSessions.status, ConsultationSessionStatus.PENDING),
        ),
      )
      .orderBy(desc(consultationSessions.id))
      .limit(1);
    server
      .to(SOCKET_ROOMS.EXPERT(expertId))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.INCOMING, {
        consultationId,
        expertId,
        clientId: identity.id,
        senderType: identity.actorType,
        sessionId: session?.id ?? null,
        timestamp: new Date().toISOString(),
        ...(await resolveConsultationClientName(this.db, consultationId)
          .then((clientName) => (clientName ? { clientName } : {}))
          .catch(() => ({}))),
      });
    if (!(await this.rooms.refreshRoom(consultationId))) {
      this.logger.debug(
        `[ClientChat] Room key for ${consultationId} already lapsed; timer + cron own expiry.`,
      );
    }
    return { status: CONSULTATION_ACK_STATUS.REQUESTED, consultationId };
  }

  /** Client cancel → shared rejection verdict. */
  async cancelChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    _identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: ConsultationAckStatus; consultationId: number }> {
    void socket;
    const [row] = await this.db
      .select({ expertId: consultations.expert_id })
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1);
    if (row) {
      await this.orchestrator.reject(server, {
        consultationId,
        actorId: row.expertId,
        actorType: 'expert',
        reason: 'client_cancelled',
      });
    }
    return {
      status: CONSULTATION_ACK_STATUS.CANCELLED,
      consultationId,
    };
  }

  /** Either actor ends an active chat → orchestrator end. */
  async endChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: ConsultationAckStatus; consultationId: number }> {
    void socket;
    await this.orchestrator.end(server, {
      consultationId,
      actorId: identity.id,
      actorType: identity.actorType === 'client' ? 'client' : 'expert',
      reason: 'manual',
    });
    return {
      status: CONSULTATION_ACK_STATUS.ENDED,
      consultationId,
    };
  }

  /**
   * Balance-exhaustion pause → orchestrator pause.
   */
  async pauseChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<ClientChatPauseAck> {
    await socket.join(SOCKET_ROOMS.CONSULTATION(consultationId));
    const state = await this.orchestrator.pause(server, {
      consultationId,
      actorId: identity.id,
      actorType: identity.actorType === 'client' ? 'client' : 'expert',
      reason: 'manual',
    });
    if (!state) {
      return { status: CONSULTATION_ACK_STATUS.IGNORED, consultationId };
    }
    return {
      status: CONSULTATION_ACK_STATUS.PAUSED,
      consultationId,
      elapsedSeconds: state.elapsedSeconds,
      consumedAmount: 0,
      maxMinutes: state.maxMinutes,
      mode: ConsultationMode.CHAT,
    };
  }

  /**
   * Resume after recharge → orchestrator resume.
   */
  async resumeChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<ClientChatResumeAck> {
    await socket.join(SOCKET_ROOMS.CONSULTATION(consultationId));
    const state = await this.orchestrator.resume(server, {
      consultationId,
      actorId: identity.id,
      actorType: identity.actorType === 'client' ? 'client' : 'expert',
    });
    return {
      status: CONSULTATION_ACK_STATUS.RESUMED,
      consultationId,
      maxMinutes: state.maxMinutes,
      startedAt: state.startedAt ?? new Date().toISOString(),
      mode: ConsultationMode.CHAT,
    };
  }
}
