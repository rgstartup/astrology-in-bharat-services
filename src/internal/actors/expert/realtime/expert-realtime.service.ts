import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import type {
  AuthenticatedSocketIdentity,
  ExpertSocketIdentity,
} from '@/internal/realtime/types/socket-auth.types';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';
import { ExpertPresenceHandler } from './handlers/expert-presence.handler';
import { ExpertNotificationHandler } from './handlers/expert-notification.handler';
import { ExpertChatHandler } from './handlers/expert-chat.handler';
import { ExpertCallHandler } from './handlers/expert-call.handler';

interface ChatMessageInput {
  consultationId: number;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

interface CallSignalInput {
  consultationId: number;
  offer?: Record<string, any>;
  answer?: Record<string, any>;
  candidate?: Record<string, any>;
}

interface CallEndInput {
  consultationId: number;
  reason?: string;
}

@Injectable()
export class ExpertRealtimeService {
  private readonly logger = new Logger(ExpertRealtimeService.name);

  constructor(
    private readonly presenceHandler: ExpertPresenceHandler,
    private readonly notificationHandler: ExpertNotificationHandler,
    private readonly chatHandler: ExpertChatHandler,
    private readonly callHandler: ExpertCallHandler,
  ) {}

  async handleExpertConnect(
    socket: RealtimeSocket,
    identity: ExpertSocketIdentity,
  ): Promise<void> {
    const expertRoom = SOCKET_ROOMS.EXPERT(identity.expertId);
    await socket.join(expertRoom);

    try {
      await this.presenceHandler.registerConnection(
        identity.expertId,
        socket.id,
      );
    } catch (err) {
      this.logger.error(
        `[ExpertRealtime] Failed to register presence for expert ${identity.expertId}: ${(err as Error).message}`,
      );
    }

    this.logger.log(
      `[ExpertRealtime] Expert ${identity.expertId} joined room ${expertRoom} (socket: ${socket.id})`,
    );
  }

  async handleExpertDisconnect(
    socket: RealtimeSocket,
    identity: ExpertSocketIdentity,
  ): Promise<void> {
    try {
      await this.presenceHandler.unregisterConnection(
        identity.expertId,
        socket.id,
      );
    } catch (err) {
      this.logger.error(
        `[ExpertRealtime] Failed to unregister presence for expert ${identity.expertId}: ${(err as Error).message}`,
      );
    }

    this.logger.log(
      `[ExpertRealtime] Expert ${identity.expertId} disconnected (socket: ${socket.id})`,
    );
  }

  async handleHeartbeat(
    socket: RealtimeSocket,
    identity: ExpertSocketIdentity,
  ): Promise<{ status: string; timestamp: number }> {
    return this.presenceHandler.handleHeartbeat(identity.expertId, socket.id);
  }

  async subscribeExpertPresence(socket: RealtimeSocket, expertId: number) {
    return this.presenceHandler.subscribeExpertPresence(socket, expertId);
  }

  async unsubscribeExpertPresence(socket: RealtimeSocket, expertId: number) {
    return this.presenceHandler.unsubscribeExpertPresence(socket, expertId);
  }

  async subscribeNotifications(
    socket: RealtimeSocket,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.notificationHandler.subscribeNotifications(socket, identity);
  }

  async acknowledgeNotificationRead(
    notificationId: string,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.notificationHandler.acknowledgeNotificationRead(
      notificationId,
      identity,
    );
  }

  async joinChat(
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.chatHandler.joinChat(socket, consultationId, identity);
  }

  async leaveChat(
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.chatHandler.leaveChat(socket, consultationId, identity);
  }

  async sendChatMessage(
    socket: RealtimeSocket,
    input: ChatMessageInput,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.chatHandler.sendChatMessage(socket, input, identity);
  }

  relayChatTyping(
    socket: RealtimeSocket,
    consultationId: number,
    isTyping: boolean,
    identity: AuthenticatedSocketIdentity,
  ): void {
    this.chatHandler.relayChatTyping(socket, consultationId, isTyping, identity);
  }

  async joinCall(
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.callHandler.joinCall(socket, consultationId, identity);
  }

  async leaveCall(
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.callHandler.leaveCall(socket, consultationId, identity);
  }

  relayCallSignal(
    socket: RealtimeSocket,
    event: string,
    input: CallSignalInput,
    identity: AuthenticatedSocketIdentity,
  ): void {
    this.callHandler.relayCallSignal(socket, event, input, identity);
  }

  async endCall(
    server: Server,
    socket: RealtimeSocket,
    input: CallEndInput,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.callHandler.endCall(server, socket, input, identity);
  }
}
