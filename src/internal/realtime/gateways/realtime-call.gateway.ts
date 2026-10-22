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
  CallAnswerDto,
  CallOfferDto,
  IceCandidateDto,
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
  @SubscribeMessage(SOCKET_EVENTS.MEDIA.OFFER)
  handleCallOffer(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: CallOfferDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    this.forActor(identity).relayMediaSignal(
      socket,
      SOCKET_EVENTS.MEDIA.OFFER,
      { consultationId: dto.consultationId, offer: dto.offer },
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.MEDIA.ANSWER)
  handleCallAnswer(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: CallAnswerDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    this.forActor(identity).relayMediaSignal(
      socket,
      SOCKET_EVENTS.MEDIA.ANSWER,
      { consultationId: dto.consultationId, answer: dto.answer },
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.MEDIA.ICE_CANDIDATE)
  handleCallIceCandidate(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: IceCandidateDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    this.forActor(identity).relayMediaSignal(
      socket,
      SOCKET_EVENTS.MEDIA.ICE_CANDIDATE,
      { consultationId: dto.consultationId, candidate: dto.candidate },
      identity,
    );
  }
}
