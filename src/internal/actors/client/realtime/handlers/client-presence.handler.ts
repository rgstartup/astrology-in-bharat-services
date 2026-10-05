import { Injectable, Logger, Optional } from '@nestjs/common';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';
import { PresenceService } from '@/internal/actors/expert/presence/presence.service';

export interface PresenceSubscriptionSnapshot {
  expertId: number;
  status: string;
  lastSeenAt: string | null;
}

@Injectable()
export class ClientPresenceHandler {
  private readonly logger = new Logger(ClientPresenceHandler.name);

  constructor(
    @Optional() private readonly presenceService?: PresenceService,
  ) {}

  private async snapshot(expertId: number): Promise<PresenceSubscriptionSnapshot> {
    if (!this.presenceService) {
      return { expertId, status: 'offline', lastSeenAt: null };
    }
    const full = await this.presenceService.getFullStatus(expertId);
    return { expertId, status: full.status, lastSeenAt: full.lastSeenAt };
  }

  async subscribeExpertPresence(
    socket: RealtimeSocket,
    expertId: number,
  ): Promise<PresenceSubscriptionSnapshot> {
    const room = SOCKET_ROOMS.EXPERT_PRESENCE(expertId);
    await socket.join(room);
    this.logger.debug(
      `Socket ${socket.id} subscribed to presence for expert ${expertId}`,
    );
    return this.snapshot(expertId);
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

  /**
   * Bulk-joins the caller to the presence rooms of the on-screen experts
   * and returns a live snapshot per expert (status + last-seen).
   */
  async subscribeManyExpertPresence(
    socket: RealtimeSocket,
    expertIds: number[],
  ): Promise<{ subscribed: PresenceSubscriptionSnapshot[] }> {
    const unique = [...new Set(expertIds.map(Number).filter((id) => id > 0))];
    for (const expertId of unique) {
      await socket.join(SOCKET_ROOMS.EXPERT_PRESENCE(expertId));
    }
    const subscribed: PresenceSubscriptionSnapshot[] = [];
    for (const expertId of unique) {
      subscribed.push(await this.snapshot(expertId));
    }
    this.logger.debug(
      `Socket ${socket.id} subscribed to presence for ${unique.length} experts`,
    );
    return { subscribed };
  }

  async unsubscribeManyExpertPresence(
    socket: RealtimeSocket,
    expertIds: number[],
  ): Promise<{ unsubscribed: number[] }> {
    const unique = [...new Set(expertIds.map(Number).filter((id) => id > 0))];
    for (const expertId of unique) {
      await socket.leave(SOCKET_ROOMS.EXPERT_PRESENCE(expertId));
    }
    this.logger.debug(
      `Socket ${socket.id} unsubscribed from presence for ${unique.length} experts`,
    );
    return { unsubscribed: unique };
  }
}
