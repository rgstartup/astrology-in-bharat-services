import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { RealtimeAuthService } from './services/realtime-auth.service';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';
import type { RealtimeSocket } from './types/socket-data.types';
import type { RealtimeActorType } from './types/socket-auth.types';
import { REALTIME_GATEWAY_OPTIONS } from './gateways/realtime-gateway.options';

@WebSocketGateway(REALTIME_GATEWAY_OPTIONS)
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly authService: RealtimeAuthService,
    private readonly clientRealtimeService: ClientRealtimeService,
    private readonly expertRealtimeService: ExpertRealtimeService,
  ) {}

  afterInit() {
    this.logger.log('[RealtimeGateway] Initialized on namespace /realtime');
  }

  async handleConnection(socket: RealtimeSocket): Promise<void> {
    const token = this.extractToken(socket);

    if (!token) {
      socket.data.auth = null;
      this.logger.debug(
        `[RealtimeGateway] Anonymous connection established: ${socket.id}`,
      );
      return;
    }

    const identity = await this.authService.authenticate(
      token,
      this.extractActorHint(socket),
    );

    if (!identity) {
      socket.data.auth = null;
      this.logger.warn(
        `[RealtimeGateway] Authentication failed for socket ${socket.id}`,
      );
      return;
    }

    socket.data.auth = identity;

    if (identity.actorType === 'client') {
      await this.clientRealtimeService.handleClientConnect(socket, identity);
    } else if (identity.actorType === 'expert') {
      await this.expertRealtimeService.handleExpertConnect(socket, identity);
    }

    this.logger.log(
      `[RealtimeGateway] Authenticated ${identity.actorType} ${identity.id} connected (socket: ${socket.id})`,
    );
  }

  async handleDisconnect(socket: RealtimeSocket): Promise<void> {
    const identity = socket.data?.auth;

    if (identity) {
      if (identity.actorType === 'client') {
        await this.clientRealtimeService.handleClientDisconnect(
          socket,
          identity,
        );
      } else if (identity.actorType === 'expert') {
        await this.expertRealtimeService.handleExpertDisconnect(
          socket,
          identity,
        );
      }
      this.logger.log(
        `[RealtimeGateway] Authenticated ${identity.actorType} ${identity.id} disconnected (socket: ${socket.id})`,
      );
    } else {
      this.logger.debug(
        `[RealtimeGateway] Anonymous connection disconnected: ${socket.id}`,
      );
    }
  }

  private extractToken(socket: RealtimeSocket): string | null {
    const authHeader = socket.handshake.headers?.authorization;
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      return authHeader.slice(7);
    }
    if (
      socket.handshake.auth?.token &&
      typeof socket.handshake.auth.token === 'string'
    ) {
      return socket.handshake.auth.token.replace(/^Bearer\s+/i, '');
    }
    if (
      socket.handshake.query?.token &&
      typeof socket.handshake.query.token === 'string'
    ) {
      return socket.handshake.query.token.replace(/^Bearer\s+/i, '');
    }
    return null;
  }

  /**
   * Optional client-declared actor (`socket.auth.actorType`). Only selects
   * which verifier table to check — trust still comes from the JWT itself.
   * Without it, client and expert tokens are structurally identical (shared
   * secret, `{sub, email}`), so first-match trial can misidentify the actor.
   */
  private extractActorHint(socket: RealtimeSocket): RealtimeActorType | undefined {
    const hint = socket.handshake.auth?.actorType;
    return hint === 'client' || hint === 'expert' ? hint : undefined;
  }
}
