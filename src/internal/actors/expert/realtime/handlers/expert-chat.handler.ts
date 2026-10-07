import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import {
  CHAT_ACK_STATUS,
  type ChatAckStatus,
} from '@/internal/realtime/constants/chat-ack-status.constant';
import { MarkConsultationSessionStartedUseCase } from '@/internal/consultation/room/mark-consultation-session-started.use-case';
import { chatRequestTimers } from '@/internal/realtime/chat-request-timers';
import { rejectChatConsultation } from '@/internal/realtime/chat-request-settlement';
import type { AuthenticatedSocketIdentity } from '@/internal/realtime/types/socket-auth.types';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';

interface ChatMessageInput {
  consultationId: number;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

@Injectable()
export class ExpertChatHandler {
  private readonly logger = new Logger(ExpertChatHandler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly markStarted: MarkConsultationSessionStartedUseCase,
  ) {}

  async joinChat(
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: ChatAckStatus; consultationId: number }> {
    const room = SOCKET_ROOMS.CHAT_SESSION(consultationId);
    await socket.join(room);
    if (identity.actorType === 'expert') {
      await this.markStarted.execute(consultationId, identity.expertId);
    }
    this.logger.debug(
      `Actor ${identity.actorType}:${identity.id} joined chat room ${room} (socket: ${socket.id})`,
    );
    return { status: CHAT_ACK_STATUS.JOINED, consultationId };
  }

  async leaveChat(
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: ChatAckStatus; consultationId: number }> {
    const room = SOCKET_ROOMS.CHAT_SESSION(consultationId);
    await socket.leave(room);
    this.logger.debug(
      `Actor ${identity.actorType}:${identity.id} left chat room ${room} (socket: ${socket.id})`,
    );
    return { status: CHAT_ACK_STATUS.LEFT, consultationId };
  }

  async sendChatMessage(
    socket: RealtimeSocket,
    input: ChatMessageInput,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: ChatAckStatus; message: Record<string, unknown> }> {
    const room = SOCKET_ROOMS.CHAT_SESSION(input.consultationId);
    const messagePayload = {
      consultationId: input.consultationId,
      senderId: identity.id,
      senderType: identity.actorType,
      content: input.content,
      attachmentUrl: input.attachmentUrl,
      attachmentType: input.attachmentType,
      timestamp: new Date().toISOString(),
    };

    socket.to(room).emit(SOCKET_EVENTS.CHAT.MESSAGE, messagePayload);
    socket.emit(SOCKET_EVENTS.CHAT.MESSAGE, messagePayload);

    return { status: CHAT_ACK_STATUS.SENT, message: messagePayload };
  }

  relayChatTyping(
    socket: RealtimeSocket,
    consultationId: number,
    isTyping: boolean,
    identity: AuthenticatedSocketIdentity,
  ): void {
    const room = SOCKET_ROOMS.CHAT_SESSION(consultationId);
    socket.to(room).emit(SOCKET_EVENTS.CHAT.TYPING, {
      consultationId,
      senderId: identity.id,
      senderType: identity.actorType,
      isTyping,
    });
  }

  /** Expert accept → guarded DB verdict, join the armed room, notify the client. */
  async acceptChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: ChatAckStatus; consultationId: number }> {
    chatRequestTimers.cancel(consultationId);
    const claimed = await this.db
      .update(consultations)
      .set({
        status: ConsultationStatus.ACCEPTED,
        accepted_at: new Date(),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(consultations.id, consultationId),
          eq(consultations.status, ConsultationStatus.REQUESTED),
        ),
      )
      .returning({ id: consultations.id });
    if (claimed.length === 0) {
      return { status: CHAT_ACK_STATUS.IGNORED, consultationId };
    }
    const room = SOCKET_ROOMS.CHAT_SESSION(consultationId);
    await socket.join(room);
    const expertId = identity.actorType === 'expert' ? identity.expertId : identity.id;
    if (identity.actorType === 'expert') {
      await this.markStarted.execute(consultationId, identity.expertId);
    }
    server.to(room).emit(SOCKET_EVENTS.CHAT.ACCEPTED, {
      consultationId,
      expertId,
      timestamp: new Date().toISOString(),
    });
    return { status: CHAT_ACK_STATUS.ACCEPTED, consultationId };
  }

  /** Expert reject → shared rejection verdict (status + hold release + notify). */
  async rejectChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: ChatAckStatus; consultationId: number }> {
    void socket;
    void identity;
    chatRequestTimers.cancel(consultationId);
    const settled = await rejectChatConsultation(this.db, server, consultationId);
    return {
      status: settled ? CHAT_ACK_STATUS.REJECTED : CHAT_ACK_STATUS.IGNORED,
      consultationId,
    };
  }
}
