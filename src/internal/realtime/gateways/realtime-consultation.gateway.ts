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
import { SOCKET_ROOMS } from '../constants/socket-rooms.constant';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { CurrentWsAuth } from '../decorators/current-ws-auth.decorator';
import { RealtimeWsExceptionFilter } from '../filters/ws-exception.filter';
import { ConsultationOrchestratorService } from '@/internal/consultation/orchestrator/consultation-orchestrator.service';
import type { AuthenticatedSocketIdentity } from '../types/socket-auth.types';
import type { RealtimeSocket } from '../types/socket-data.types';
import { REALTIME_GATEWAY_OPTIONS } from './realtime-gateway.options';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

class ConsultationActionDto {
  @IsNumber()
  @IsNotEmpty()
  consultationId!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

class ConsultationRequestDto extends ConsultationActionDto {
  @IsNumber()
  @IsNotEmpty()
  expertId!: number;
}

@UseFilters(RealtimeWsExceptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway(REALTIME_GATEWAY_OPTIONS)
export class RealtimeConsultationGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeConsultationGateway.name);

  constructor(
    private readonly orchestrator: ConsultationOrchestratorService,
  ) {}

  afterInit() {
    this.logger.log('[RealtimeConsultationGateway] Initialized on namespace /realtime');
    void this.orchestrator.onServerReady(this.server);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.ACCEPT)
  async handleAccept(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    if (identity.actorType !== 'expert') {
      return { status: 'ignored', message: 'Only experts can accept consultations' };
    }
    await socket.join(SOCKET_ROOMS.CONSULTATION(dto.consultationId));
    await socket.join(SOCKET_ROOMS.CHAT_SESSION(dto.consultationId));
    return this.orchestrator.accept(this.server, {
      consultationId: dto.consultationId,
      actorId: identity.expertId,
      actorType: 'expert',
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.REJECT)
  async handleReject(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    if (identity.actorType !== 'expert') {
      return { status: 'ignored', message: 'Only experts can reject consultations' };
    }
    return this.orchestrator.reject(this.server, {
      consultationId: dto.consultationId,
      actorId: identity.expertId,
      actorType: 'expert',
      reason: dto.reason,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.REQUEST)
  async handleRequest(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: ConsultationRequestDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    if (identity.actorType !== 'client') {
      return { status: 'ignored', message: 'Only clients can request consultations' };
    }
    await socket.join(SOCKET_ROOMS.CONSULTATION(dto.consultationId));
    await socket.join(SOCKET_ROOMS.CHAT_SESSION(dto.consultationId));
    return this.orchestrator.request(this.server, {
      consultationId: dto.consultationId,
      actorId: identity.id,
      actorType: 'client',
      expertId: dto.expertId,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.CANCEL)
  async handleCancel(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    if (identity.actorType !== 'client') {
      return { status: 'ignored', message: 'Only clients can cancel consultations' };
    }
    return this.orchestrator.cancel(this.server, {
      consultationId: dto.consultationId,
      actorId: identity.id,
      actorType: 'client',
      reason: dto.reason,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.START)
  async handleStart(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    const actorId = identity.actorType === 'expert' ? identity.expertId : identity.id;
    return this.orchestrator.start(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType: identity.actorType === 'client' ? 'client' : 'expert',
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.PAUSE)
  async handlePause(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    const actorId = identity.actorType === 'expert' ? identity.expertId : identity.id;
    return this.orchestrator.pause(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType: identity.actorType === 'client' ? 'client' : 'expert',
      reason: 'manual',
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.RESUME)
  async handleResume(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    const actorId = identity.actorType === 'expert' ? identity.expertId : identity.id;
    return this.orchestrator.resume(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType: identity.actorType === 'client' ? 'client' : 'expert',
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.END)
  async handleEnd(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    const actorId = identity.actorType === 'expert' ? identity.expertId : identity.id;
    return this.orchestrator.end(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType: identity.actorType === 'client' ? 'client' : 'expert',
      reason: dto.reason ?? 'manual',
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.GET_STATUS)
  async handleGetStatus(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
  ) {
    return this.orchestrator.getStatus(dto.consultationId);
  }
}
