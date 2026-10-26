import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Server } from 'socket.io';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { CurrentWsAuth } from '../decorators/current-ws-auth.decorator';
import { RealtimeWsExceptionFilter } from '../filters/ws-exception.filter';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';
import { JoinRoomDto, LeaveRoomDto, MediaReadyDto, VoiceTokenDto } from './room-events.dto';
import type { AuthenticatedSocketIdentity } from '../types/socket-auth.types';
import type { RealtimeSocket } from '../types/socket-data.types';

/**
 * @deprecated Consolidated into `ConsultationGateway`.
 * All consultation room lifecycle handlers (`consultation:join`, `consultation:leave`,
 * `consultation:media_ready`, `consultation:voice_token`) are now served authoritatively
 * by `ConsultationGateway` to eliminate duplicate listeners on `/realtime`.
 */
@UseFilters(RealtimeWsExceptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class RealtimeRoomGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeRoomGateway.name);

  constructor(
    private readonly clientRealtimeService: ClientRealtimeService,
    private readonly expertRealtimeService: ExpertRealtimeService,
  ) {}

  afterInit() {
    this.logger.log('[RealtimeRoomGateway] Initialized on namespace /realtime');
  }

  private forActor(identity: AuthenticatedSocketIdentity) {
    return identity.actorType === 'client'
      ? this.clientRealtimeService
      : this.expertRealtimeService;
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.JOIN)
  async handleRoomJoin(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: JoinRoomDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.forActor(identity).joinConsultation(
      this.server,
      socket,
      dto.consultationId,
      dto.mode ?? 'chat',
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.MEDIA_READY)
  async handleMediaReady(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: MediaReadyDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    void socket;
    return this.forActor(identity).mediaReady(
      this.server,
      dto.consultationId,
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.VOICE_TOKEN)
  async handleVoiceToken(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: VoiceTokenDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    void socket;
    return this.forActor(identity).voiceToken(dto.consultationId, identity);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.LEAVE)
  async handleRoomLeave(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: LeaveRoomDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.forActor(identity).leaveConsultation(
      socket,
      dto.consultationId,
      identity,
    );
  }
}
