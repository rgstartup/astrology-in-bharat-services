import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { PRESENCE_EVENT_NAME } from '@/internal/actors/expert/presence/presence.constants';
import type { PresenceChangedEventPayload } from '@/internal/actors/expert/presence/presence.types';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { SOCKET_ROOMS } from '../constants/socket-rooms.constant';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { WsAuthorizationGuard } from '../guards/ws-authorization.guard';
import { WsRoles } from '../decorators/ws-roles.decorator';
import { CurrentWsAuth } from '../decorators/current-ws-auth.decorator';
import { RealtimeWsExceptionFilter } from '../filters/ws-exception.filter';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';
import { SubscribePresenceDto } from '../dto/subscribe-presence.dto';
import type { AuthenticatedSocketIdentity } from '../types/socket-auth.types';
import type { RealtimeSocket } from '../types/socket-data.types';
import { REALTIME_GATEWAY_OPTIONS } from './realtime-gateway.options';

@UseFilters(RealtimeWsExceptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway(REALTIME_GATEWAY_OPTIONS)
export class RealtimePresenceGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimePresenceGateway.name);

  constructor(
    private readonly clientRealtimeService: ClientRealtimeService,
    private readonly expertRealtimeService: ExpertRealtimeService,
  ) {}

  afterInit() {
    this.logger.log(
      '[RealtimePresenceGateway] Initialized on namespace /realtime',
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.PRESENCE.SUBSCRIBE)
  async handlePresenceSubscribe(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: SubscribePresenceDto,
  ) {
    return this.clientRealtimeService.subscribeExpertPresence(
      socket,
      dto.expertId,
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.PRESENCE.UNSUBSCRIBE)
  async handlePresenceUnsubscribe(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: SubscribePresenceDto,
  ) {
    return this.clientRealtimeService.unsubscribeExpertPresence(
      socket,
      dto.expertId,
    );
  }

  @UseGuards(WsAuthGuard, WsAuthorizationGuard)
  @WsRoles('expert')
  @SubscribeMessage(SOCKET_EVENTS.PRESENCE.HEARTBEAT)
  async handlePresenceHeartbeat(
    @ConnectedSocket() socket: RealtimeSocket,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    if (identity.actorType === 'expert') {
      return this.expertRealtimeService.handleHeartbeat(socket, identity);
    }
    return { status: 'error', message: 'Forbidden' };
  }

  @OnEvent(PRESENCE_EVENT_NAME)
  handlePresenceChanged(payload: PresenceChangedEventPayload) {
    if (!this.server) {
      return;
    }

    this.server.emit(SOCKET_EVENTS.PRESENCE.UPDATED, payload);
    this.server
      .to(SOCKET_ROOMS.EXPERT_PRESENCE(payload.expertId))
      .emit(SOCKET_EVENTS.PRESENCE.UPDATED, payload);
    this.server
      .to(SOCKET_ROOMS.EXPERT(payload.expertId))
      .emit(SOCKET_EVENTS.PRESENCE.UPDATED, payload);

    this.logger.log(
      `[RealtimePresenceGateway] 📢 Broadcasted presence update: expert ${payload.expertId} is now ${payload.status}`,
    );
  }
}
