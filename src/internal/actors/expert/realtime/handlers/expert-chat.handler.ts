import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { ConsultationMode } from '@/internal/consultation/enums';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import {
  persistChatMessage,
  resolveMessageSessionId,
  toMessageType,
} from '@/internal/realtime/chat/chat-message-persistence';
import {
  CONSULTATION_ACK_STATUS,
  type ConsultationAckStatus,
} from '@/internal/realtime/constants/consultation-ack-status.constant';
import { ConsultationRoomRepository } from '@/internal/consultation/room/consultation-room.repository';
import { isChatParticipant } from '@/internal/realtime/chat/chat-room-access';
import type { AuthenticatedSocketIdentity } from '@/internal/realtime/types/socket-auth.types';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';

import { ConsultationOrchestratorService } from '@/internal/consultation/orchestrator/consultation-orchestrator.service';

export interface ExpertChatPauseAck {
  status: ConsultationAckStatus;
  consultationId: number;
  elapsedSeconds?: number;
  consumedAmount?: number;
  maxMinutes?: number;
  mode?: ConsultationMode;
}

export interface ExpertChatResumeAck {
  status: ConsultationAckStatus;
  consultationId: number;
  maxMinutes?: number;
  startedAt?: string | null;
  /** Consumed seconds carried forward as the resume base (pre-resume billing). */
  elapsedSeconds?: number;
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
export class ExpertChatHandler {
  private readonly logger = new Logger(ExpertChatHandler.name);

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
    if (!(await isChatParticipant(this.db, input.consultationId, identity))) {
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
    // Foolproof backstop: a send past zero pauses first (both sides get
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
      identity.actorType === 'expert' ? identity.expertId : identity.id;

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

  /**
   * Expert accept → orchestrator accept. Passes the use-case result through
   * so the accept-time voice token (voice/video only) reaches the accept ack.
   */
  async acceptChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{
    status: ConsultationAckStatus;
    consultationId: number;
    token?: string;
    tokenExpiresAt?: string;
    channelName?: string;
  }> {
    const room = SOCKET_ROOMS.CONSULTATION(consultationId);
    await socket.join(room);
    const accepted = await this.orchestrator.accept(server, {
      consultationId,
      actorId:
        identity.actorType === 'expert' ? identity.expertId : identity.id,
      actorType: 'expert',
    });
    return {
      status: CONSULTATION_ACK_STATUS.ACCEPTED,
      consultationId,
      ...(accepted?.token ? { token: accepted.token } : {}),
      ...(accepted?.tokenExpiresAt
        ? { tokenExpiresAt: accepted.tokenExpiresAt }
        : {}),
      ...(accepted?.channelName ? { channelName: accepted.channelName } : {}),
    };
  }

  /** Expert reject → orchestrator reject. */
  async rejectChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: ConsultationAckStatus; consultationId: number }> {
    void socket;
    await this.orchestrator.reject(server, {
      consultationId,
      actorId:
        identity.actorType === 'expert' ? identity.expertId : identity.id,
      actorType: 'expert',
      reason: 'expert_rejected',
    });
    return {
      status: CONSULTATION_ACK_STATUS.REJECTED,
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
      actorId:
        identity.actorType === 'expert' ? identity.expertId : identity.id,
      actorType: identity.actorType === 'expert' ? 'expert' : 'client',
      reason: 'manual',
    });
    return {
      status: CONSULTATION_ACK_STATUS.ENDED,
      consultationId,
    };
  }

  /** Balance-exhaustion pause → orchestrator pause. */
  async pauseChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<ExpertChatPauseAck> {
    await socket.join(SOCKET_ROOMS.CONSULTATION(consultationId));
    const state = await this.orchestrator.pause(server, {
      consultationId,
      actorId:
        identity.actorType === 'expert' ? identity.expertId : identity.id,
      actorType: identity.actorType === 'expert' ? 'expert' : 'client',
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

  /** Resume after recharge → orchestrator resume. */
  async resumeChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<ExpertChatResumeAck> {
    await socket.join(SOCKET_ROOMS.CONSULTATION(consultationId));
    const state = await this.orchestrator.resume(server, {
      consultationId,
      actorId:
        identity.actorType === 'expert' ? identity.expertId : identity.id,
      actorType: identity.actorType === 'expert' ? 'expert' : 'client',
    });
    return {
      status: CONSULTATION_ACK_STATUS.RESUMED,
      consultationId,
      maxMinutes: state.maxMinutes,
      startedAt: state.startedAt ?? new Date().toISOString(),
      elapsedSeconds: state.elapsedSeconds,
      mode: ConsultationMode.CHAT,
    };
  }
}
