import { Injectable, Logger } from '@nestjs/common';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';

@Injectable()
export class ClientPresenceHandler {
  private readonly logger = new Logger(ClientPresenceHandler.name);

  async subscribeExpertPresence(
    socket: RealtimeSocket,
    expertId: number,
  ): Promise<{ expertId: number; status: string }> {
    const room = SOCKET_ROOMS.EXPERT_PRESENCE(expertId);
    await socket.join(room);
    this.logger.debug(
      `Socket ${socket.id} subscribed to presence for expert ${expertId}`,
    );
    return { expertId, status: 'subscribed' };
  }

  async unsubscribeExpertPresence(
    socket: RealtimeSocket,
    expertId: number,
  ): Promise<{ expertId: number; status: string }> {
    const room = SOCKET_ROOMS.EXPERT_PRESENCE(expertId);
    await socket.leave(room);
    this.logger.debug(
      `Socket ${socket.id} unsubscribed from presence for expert ${expertId}`,
    );
    return { expertId, status: 'unsubscribed' };
  }
}
