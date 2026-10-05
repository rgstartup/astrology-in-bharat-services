import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import type {
  AuthenticatedSocketIdentity,
  ClientSocketIdentity,
} from '@/internal/realtime/types/socket-auth.types';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';
import { ClientPresenceHandler } from './handlers/client-presence.handler';
import { ClientNotificationHandler } from './handlers/client-notification.handler';
import { ClientChatHandler } from './handlers/client-chat.handler';
import { ClientCallHandler } from './handlers/client-call.handler';

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
export class ClientRealtimeService {
  private readonly logger = new Logger(ClientRealtimeService.name);

  constructor(
    private readonly presenceHandler: ClientPresenceHandler,
    private readonly notificationHandler: ClientNotificationHandler,
    private readonly chatHandler: ClientChatHandler,
    private readonly callHandler: ClientCallHandler,
  ) {}

  async handleClientConnect(
    socket: RealtimeSocket,
    identity: ClientSocketIdentity,
  ): Promise<void> {
    const clientRoom = SOCKET_ROOMS.CLIENT(identity.clientId);
    await socket.join(clientRoom);
    this.logger.log(
      `[ClientRealtime] Client ${identity.clientId} joined room ${clientRoom} (socket: ${socket.id})`,
    );
  }

  async handleClientDisconnect(
    socket: RealtimeSocket,
    identity: ClientSocketIdentity,
  ): Promise<void> {
    this.logger.log(
      `[ClientRealtime] Client ${identity.clientId} disconnected (socket: ${socket.id})`,
    );
  }

  async subscribeExpertPresence(socket: RealtimeSocket, expertId: number) {
    return this.presenceHandler.subscribeExpertPresence(socket, expertId);
  }

  async unsubscribeExpertPresence(socket: RealtimeSocket, expertId: number) {
    return this.presenceHandler.unsubscribeExpertPresence(socket, expertId);
  }

  async subscribeManyExpertPresence(
    socket: RealtimeSocket,
    expertIds: number[],
  ) {
    return this.presenceHandler.subscribeManyExpertPresence(socket, expertIds);
  }

  async unsubscribeManyExpertPresence(
    socket: RealtimeSocket,
    expertIds: number[],
  ) {
    return this.presenceHandler.unsubscribeManyExpertPresence(
      socket,
      expertIds,
    );
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
