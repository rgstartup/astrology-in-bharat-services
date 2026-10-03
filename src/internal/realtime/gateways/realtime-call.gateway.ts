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
import { Server } from 'socket.io';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { CurrentWsAuth } from '../decorators/current-ws-auth.decorator';
import { RealtimeWsExceptionFilter } from '../filters/ws-exception.filter';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';
import {
  CallActionDto,
  CallAnswerDto,
  CallOfferDto,
  IceCandidateDto,
  JoinCallDto,
} from '../dto/call-events.dto';
import type { AuthenticatedSocketIdentity } from '../types/socket-auth.types';
import type { RealtimeSocket } from '../types/socket-data.types';
import { REALTIME_GATEWAY_OPTIONS } from './realtime-gateway.options';

@UseFilters(RealtimeWsExceptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway(REALTIME_GATEWAY_OPTIONS)
export class RealtimeCallGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeCallGateway.name);

  constructor(
    private readonly clientRealtimeService: ClientRealtimeService,
    private readonly expertRealtimeService: ExpertRealtimeService,
  ) {}

  afterInit() {
    this.logger.log('[RealtimeCallGateway] Initialized on namespace /realtime');
  }

  private forActor(identity: AuthenticatedSocketIdentity) {
    return identity.actorType === 'client'
      ? this.clientRealtimeService
      : this.expertRealtimeService;
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CALL.JOIN)
  async handleCallJoin(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: JoinCallDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.forActor(identity).joinCall(
      socket,
      dto.consultationId,
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CALL.OFFER)
  handleCallOffer(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: CallOfferDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    this.forActor(identity).relayCallSignal(
      socket,
      SOCKET_EVENTS.CALL.OFFER,
      { consultationId: dto.consultationId, offer: dto.offer },
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CALL.ANSWER)
  handleCallAnswer(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: CallAnswerDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    this.forActor(identity).relayCallSignal(
      socket,
      SOCKET_EVENTS.CALL.ANSWER,
      { consultationId: dto.consultationId, answer: dto.answer },
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CALL.ICE_CANDIDATE)
  handleCallIceCandidate(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: IceCandidateDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    this.forActor(identity).relayCallSignal(
      socket,
      SOCKET_EVENTS.CALL.ICE_CANDIDATE,
      { consultationId: dto.consultationId, candidate: dto.candidate },
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CALL.END)
  async handleCallEnd(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: CallActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.forActor(identity).endCall(
      this.server,
      socket,
      { consultationId: dto.consultationId, reason: dto.reason },
      identity,
    );
  }
}
