import { Injectable, Logger, Optional } from '@nestjs/common';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';
import { PresenceService } from '@/internal/actors/expert/presence/presence.service';

@Injectable()
export class ExpertPresenceHandler {
  private readonly logger = new Logger(ExpertPresenceHandler.name);

  constructor(
    @Optional() private readonly presenceService?: PresenceService,
  ) {}

  async registerConnection(
    expertId: number,
    socketId: string,
  ): Promise<void> {
    if (this.presenceService) {
      await this.presenceService.connect(expertId, socketId);
    }
  }

  async unregisterConnection(
    expertId: number,
    socketId: string,
  ): Promise<void> {
    if (this.presenceService) {
      await this.presenceService.disconnect(expertId, socketId);
    }
  }

  async handleHeartbeat(
    expertId: number,
    socketId: string,
  ): Promise<{ status: string; timestamp: number }> {
    if (this.presenceService) {
      await this.presenceService.heartbeat(expertId, socketId);
    }
    return { status: 'ok', timestamp: Date.now() };
  }

  async getStatus(expertId: number): Promise<string> {
    if (this.presenceService) {
      return this.presenceService.getStatus(expertId);
    }
    return 'offline';
  }

  async subscribeExpertPresence(
    socket: RealtimeSocket,
    expertId: number,
  ): Promise<{ expertId: number; status: string }> {
    const room = SOCKET_ROOMS.EXPERT_PRESENCE(expertId);
    await socket.join(room);

    const status = await this.getStatus(expertId);

    this.logger.debug(
      `Socket ${socket.id} subscribed to presence for expert ${expertId}`,
    );

    return { expertId, status };
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
