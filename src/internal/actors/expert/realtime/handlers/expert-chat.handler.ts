import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Server } from "socket.io";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { ConsultationMode } from "@/internal/consultation/enums";
import { SOCKET_EVENTS } from "@/internal/realtime/constants/socket-events.constant";
import { SOCKET_ROOMS } from "@/internal/realtime/constants/socket-rooms.constant";
import {
  persistChatMessage,
  resolveMessageSessionId,
  toMessageType,
} from "@/internal/realtime/chat/chat-message-persistence";
import {
  CONSULTATION_ACK_STATUS,
  type ConsultationAckStatus,
} from "@/internal/realtime/constants/consultation-ack-status.constant";
import { ConsultationRoomRepository } from "@/internal/consultation/room/consultation-room.repository";
import { isConsultationParticipant } from "@/internal/realtime/room/consultation-room-access";
import type { AuthenticatedSocketIdentity } from "@/internal/realtime/types/socket-auth.types";
import type { RealtimeSocket } from "@/internal/realtime/types/socket-data.types";

import { ConsultationOrchestratorService } from "@/internal/consultation/orchestrator/consultation-orchestrator.service";

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
    if (
      !(await isConsultationParticipant(
        this.db,
        input.consultationId,
        identity,
      ))
    ) {
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
      identity.actorType === "expert" ? identity.expertId : identity.id;

    const sessionId = await resolveMessageSessionId(
      this.db,
      input.consultationId,
    );

    const persisted = await persistChatMessage(this.db, {
      consultationId: input.consultationId,
      sessionId,
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
}
