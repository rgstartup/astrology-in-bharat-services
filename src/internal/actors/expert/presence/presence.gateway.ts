import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { PRESENCE_EVENT_NAME } from './presence.constants';
import { PresenceService } from './presence.service';
import { type PresenceChangedEventPayload } from './presence.types';
import { ExpertClientStatus } from '@/core/enums';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(PresenceGateway.name);

  constructor(
    private readonly presenceService: PresenceService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.debug(
          `Anonymous/client connection connected without token: ${client.id}`,
        );
        return;
      }

      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email?: string;
        role?: string;
      }>(token);

      if (payload && payload.sub) {
        const expertId = Number(payload.sub);
        client.data.expertId = expertId;
        client.data.authenticated = true;

        await client.join(`expert_${expertId}`);
        await this.presenceService.connect(expertId, client.id);

        this.logger.log(
          `[Gateway] Authenticated expert ${expertId} connected (socket: ${client.id})`,
        );
      }
    } catch (err) {
      this.logger.debug(
        `Socket connection auth check failed for ${client.id}: ${(err as Error).message}`,
      );
      // Non-expert or invalid token connection allowed as public/guest listener, but not registered as expert presence
    }
  }

  async handleDisconnect(client: Socket) {
    const expertId = client.data?.expertId;
    if (expertId) {
      try {
        await this.presenceService.disconnect(expertId, client.id);
        this.logger.log(
          `[Gateway] Expert ${expertId} disconnected (socket: ${client.id})`,
        );
      } catch (err) {
        this.logger.error(
          `Error during disconnect handling for expert ${expertId}: ${(err as Error).message}`,
        );
      }
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const expertId = client.data?.expertId;
    if (!expertId) {
      return { status: 'error', message: 'Unauthorized expert session' };
    }

    await this.presenceService.heartbeat(expertId, client.id);
    return { status: 'ok', timestamp: Date.now() };
  }

  @SubscribeMessage('subscribe_expert_presence')
  async handleSubscribeExpert(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { expertId: number },
  ) {
    if (data?.expertId) {
      await client.join(`expert_presence_${data.expertId}`);
      const status = await this.presenceService.getStatus(
        Number(data.expertId),
      );
      return { expertId: data.expertId, status };
    }
    return { status: 'error', message: 'Invalid expertId' };
  }

  @OnEvent(PRESENCE_EVENT_NAME)
  handlePresenceChanged(payload: PresenceChangedEventPayload) {
    if (!this.server) return;

    // 1. Client-facing standardized event
    this.server.emit(PRESENCE_EVENT_NAME, payload);

    // 2. Specific rooms
    this.server
      .to(`expert_${payload.expertId}`)
      .emit(PRESENCE_EVENT_NAME, payload);
    this.server
      .to(`expert_presence_${payload.expertId}`)
      .emit(PRESENCE_EVENT_NAME, payload);

    // 3. Backward-compatibility event for legacy frontends
    this.server.emit('expert_status_changed', {
      expert_id: payload.expertId,
      status: payload.status,
      is_available: payload.status === ExpertClientStatus.ONLINE,
      timestamp: payload.timestamp,
    });

    this.logger.log(
      `[Gateway] 📢 Broadcasted presence change: expert ${payload.expertId} is now ${payload.status}`,
    );
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers?.authorization;
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      return authHeader.slice(7);
    }
    if (
      client.handshake.auth?.token &&
      typeof client.handshake.auth.token === 'string'
    ) {
      return client.handshake.auth.token.replace(/^Bearer\s+/i, '');
    }
    if (
      client.handshake.query?.token &&
      typeof client.handshake.query.token === 'string'
    ) {
      return client.handshake.query.token.replace(/^Bearer\s+/i, '');
    }
    return null;
  }
}
