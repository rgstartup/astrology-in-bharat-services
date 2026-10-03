import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { CurrentWsAuth } from '../decorators/current-ws-auth.decorator';
import { RealtimeWsExceptionFilter } from '../filters/ws-exception.filter';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';
import { ReadNotificationDto } from '../dto/notification-events.dto';
import type { AuthenticatedSocketIdentity } from '../types/socket-auth.types';
import type { RealtimeSocket } from '../types/socket-data.types';
import { REALTIME_GATEWAY_OPTIONS } from './realtime-gateway.options';

@UseFilters(RealtimeWsExceptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway(REALTIME_GATEWAY_OPTIONS)
export class RealtimeNotificationGateway implements OnGatewayInit {
  private readonly logger = new Logger(RealtimeNotificationGateway.name);

  constructor(
    private readonly clientRealtimeService: ClientRealtimeService,
    private readonly expertRealtimeService: ExpertRealtimeService,
  ) {}

  afterInit() {
    this.logger.log(
      '[RealtimeNotificationGateway] Initialized on namespace /realtime',
    );
  }

  private forActor(identity: AuthenticatedSocketIdentity) {
    return identity.actorType === 'client'
      ? this.clientRealtimeService
      : this.expertRealtimeService;
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.NOTIFICATION.SUBSCRIBE)
  async handleNotificationSubscribe(
    @ConnectedSocket() socket: RealtimeSocket,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.forActor(identity).subscribeNotifications(socket, identity);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.NOTIFICATION.READ)
  async handleNotificationRead(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ReadNotificationDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.forActor(identity).acknowledgeNotificationRead(
      dto.notificationId,
      identity,
    );
  }
}
