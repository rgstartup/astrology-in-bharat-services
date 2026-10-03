import { Injectable, Logger } from '@nestjs/common';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
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

  async joinChat(
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: string; consultationId: number }> {
    const room = SOCKET_ROOMS.CHAT_SESSION(consultationId);
    await socket.join(room);
    this.logger.debug(
      `Actor ${identity.actorType}:${identity.id} joined chat room ${room} (socket: ${socket.id})`,
    );
    return { status: 'joined', consultationId };
  }

  async leaveChat(
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: string; consultationId: number }> {
    const room = SOCKET_ROOMS.CHAT_SESSION(consultationId);
    await socket.leave(room);
    this.logger.debug(
      `Actor ${identity.actorType}:${identity.id} left chat room ${room} (socket: ${socket.id})`,
    );
    return { status: 'left', consultationId };
  }

  async sendChatMessage(
    socket: RealtimeSocket,
    input: ChatMessageInput,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: string; message: Record<string, unknown> }> {
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

    return { status: 'sent', message: messagePayload };
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
}
