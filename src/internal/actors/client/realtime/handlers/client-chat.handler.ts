import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { chatRequestTimers } from '@/internal/realtime/chat-request-timers';
import { ConsultationRoomRepository } from '@/internal/consultation/room/consultation-room.repository';
import {
  CHAT_ACK_STATUS,
  type ChatAckStatus,
} from '@/internal/realtime/constants/chat-ack-status.constant';
import type { AuthenticatedSocketIdentity } from '@/internal/realtime/types/socket-auth.types';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';

interface ChatMessageInput {
  consultationId: number;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

@Injectable()
export class ClientChatHandler {
  private readonly logger = new Logger(ClientChatHandler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
  ) {}

  async joinChat(
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: ChatAckStatus; consultationId: number }> {
    const room = SOCKET_ROOMS.CHAT_SESSION(consultationId);
    await socket.join(room);
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

  /** Client chat request → forward as `chat:incoming` to the expert's room. Ack confirms delivery. */
  async requestChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    expertId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: ChatAckStatus; consultationId: number }> {
    const room = SOCKET_ROOMS.CHAT_SESSION(consultationId);
    await socket.join(room);
    server.to(SOCKET_ROOMS.EXPERT(expertId)).emit(SOCKET_EVENTS.CHAT.INCOMING, {
      consultationId,
      expertId,
      clientId: identity.id,
      senderType: identity.actorType,
      timestamp: new Date().toISOString(),
    });
    chatRequestTimers.arm(this.db, server, consultationId);
    if (!(await this.rooms.refreshRoom(consultationId))) {
      this.logger.debug(
        `[ClientChat] Room key for ${consultationId} already lapsed; timer + cron own expiry.`,
      );
    }
    return { status: CHAT_ACK_STATUS.REQUESTED, consultationId };
  }
}
