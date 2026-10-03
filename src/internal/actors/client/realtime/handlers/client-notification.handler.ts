import { Injectable, Logger } from '@nestjs/common';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import type { AuthenticatedSocketIdentity } from '@/internal/realtime/types/socket-auth.types';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';

@Injectable()
export class ClientNotificationHandler {
  private readonly logger = new Logger(ClientNotificationHandler.name);

  async subscribeNotifications(
    socket: RealtimeSocket,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: string; room: string }> {
    const room = SOCKET_ROOMS.CLIENT(identity.id);
    await socket.join(room);
    this.logger.debug(
      `Socket ${socket.id} subscribed to client notifications on room ${room}`,
    );
    return { status: 'subscribed', room };
  }

  async acknowledgeNotificationRead(
    notificationId: string,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: string; notificationId: string }> {
    this.logger.debug(
      `Actor ${identity.actorType}:${identity.id} read notification ${notificationId}`,
    );
    return { status: 'ok', notificationId };
  }
}
