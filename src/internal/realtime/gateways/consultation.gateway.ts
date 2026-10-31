import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  Inject,
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { SOCKET_ROOMS } from '../constants/socket-rooms.constant';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { CurrentWsAuth } from '../decorators/current-ws-auth.decorator';
import { RealtimeWsExceptionFilter } from '../filters/ws-exception.filter';
import { ConsultationOrchestratorService } from '@/internal/consultation/orchestrator/consultation-orchestrator.service';
import type { ConsultationModeType } from '@/internal/consultation/orchestrator/consultation-orchestrator.types';
import {
  joinConsultationRoom,
  leaveConsultationRoom,
  refreshVoiceToken,
} from '@/internal/realtime/room/consultation-room-membership';
import { ConsultationRoomRepository } from '@/internal/consultation/room/consultation-room.repository';
import { ResolveConsultationBudgetUseCase } from '@/internal/consultation/room/resolve-consultation-budget.use-case';
import { VoiceService } from '@/external/voice';
import { DomainError } from '@/shared/types/domain.error';
import type { AuthenticatedSocketIdentity } from '../types/socket-auth.types';
import type { RealtimeSocket } from '../types/socket-data.types';
import { REALTIME_GATEWAY_OPTIONS } from './gateway.options';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

class ConsultationActionDto {
  @IsNumber()
  @IsNotEmpty()
  consultationId!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

class ConsultationResumeDto extends ConsultationActionDto {
  @IsString()
  @IsOptional()
  @IsIn(['chat', 'voice', 'video'])
  mode?: ConsultationModeType;
}

class ConsultationRequestDto extends ConsultationActionDto {
  @IsNumber()
  @IsNotEmpty()
  expertId!: number;
}

class ConsultationJoinDto extends ConsultationActionDto {
  @IsString()
  @IsNotEmpty()
  mode!: ConsultationModeType;
}

@UseFilters(RealtimeWsExceptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway(REALTIME_GATEWAY_OPTIONS)
export class ConsultationGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ConsultationGateway.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
    private readonly budget: ResolveConsultationBudgetUseCase,
    private readonly voice: VoiceService,
    private readonly orchestrator: ConsultationOrchestratorService,
  ) {}

  afterInit() {
    this.logger.log(
      '[ConsultationGateway] Initialized on namespace /realtime',
    );
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
      return {
        status: 'ignored',
        message: 'Only experts can accept consultations',
      };
    }
    await socket.join(SOCKET_ROOMS.CONSULTATION(dto.consultationId));
    const result = await this.orchestrator.accept(this.server, {
      consultationId: dto.consultationId,
      actorId: identity.expertId,
      actorType: 'expert',
    });
    // Resume path: the client may already be recorded as joined (join
    // happens before accept). Recording the expert here closes the
    // both-joined gate on accept itself so the timer starts in realtime
    // without waiting for a later `consultation:join`.
    await this.orchestrator
      .recordJoin(this.server, dto.consultationId, 'expert', identity.expertId)
      .catch(() => undefined);
    return result;
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.REJECT)
  async handleReject(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    if (identity.actorType !== 'expert') {
      return {
        status: 'ignored',
        message: 'Only experts can reject consultations',
      };
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
      return {
        status: 'ignored',
        message: 'Only clients can request consultations',
      };
    }
    await socket.join(SOCKET_ROOMS.CONSULTATION(dto.consultationId));
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
      return {
        status: 'ignored',
        message: 'Only clients can cancel consultations',
      };
    }
    return this.orchestrator.cancel(this.server, {
      consultationId: dto.consultationId,
      actorId: identity.id,
      actorType: 'client',
      reason: dto.reason,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.CLOSE)
  async handleClose(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    if (identity.actorType !== 'expert') {
      return {
        status: 'ignored',
        message: 'Only experts can close consultations',
      };
    }
    try {
      return await this.orchestrator.close(this.server, {
        consultationId: dto.consultationId,
        actorId: identity.expertId,
        actorType: 'expert',
        reason: dto.reason,
      });
    } catch (error: unknown) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Close failed',
      };
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.SWITCH_TO_CHAT)
  async handleSwitchToChat(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    if (identity.actorType !== 'client') {
      return {
        status: 'ignored',
        message: 'Only clients can continue a consultation over chat',
      };
    }
    try {
      return await this.orchestrator.switchToChat(this.server, {
        consultationId: dto.consultationId,
        actorId: identity.id,
        actorType: 'client',
      });
    } catch (error) {
      // The websocket exception filter cannot answer an ack, so business
      // errors are returned as an error ack the client can react to.
      if (error instanceof DomainError) {
        return { status: 'error', code: error.code, message: error.message };
      }
      throw error;
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.START)
  async handleStart(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    const actorId =
      identity.actorType === 'expert' ? identity.expertId : identity.id;
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
    const actorId =
      identity.actorType === 'expert' ? identity.expertId : identity.id;
    // Only the client may freeze billing for its confirmation dialogs.
    const billingHold =
      identity.actorType === 'client' && dto.reason === 'billing_hold';
    return this.orchestrator.pause(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType: identity.actorType === 'client' ? 'client' : 'expert',
      reason: billingHold ? 'billing_hold' : 'manual',
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.RESUME)
  async handleResume(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationResumeDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    const actorId =
      identity.actorType === 'expert' ? identity.expertId : identity.id;
    return this.orchestrator.resume(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType: identity.actorType === 'client' ? 'client' : 'expert',
      targetMode: dto.mode,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.RESUME_CHAT)
  async handleResumeChat(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    const actorId =
      identity.actorType === 'expert' ? identity.expertId : identity.id;
    return this.orchestrator.resume(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType: identity.actorType === 'client' ? 'client' : 'expert',
      targetMode: 'chat',
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.RESUME_VOICE)
  async handleResumeVoice(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    const actorId =
      identity.actorType === 'expert' ? identity.expertId : identity.id;
    return this.orchestrator.resume(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType: identity.actorType === 'client' ? 'client' : 'expert',
      targetMode: 'voice',
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.RESUME_VIDEO)
  async handleResumeVideo(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    const actorId =
      identity.actorType === 'expert' ? identity.expertId : identity.id;
    return this.orchestrator.resume(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType: identity.actorType === 'client' ? 'client' : 'expert',
      targetMode: 'video',
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.END)
  async handleEnd(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    const actorId =
      identity.actorType === 'expert' ? identity.expertId : identity.id;
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

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.JOIN)
  async handleJoin(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: ConsultationJoinDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    if (identity.actorType !== 'client' && identity.actorType !== 'expert') {
      return {
        status: 'ignored',
        message: 'Only clients and experts can join consultation rooms',
      };
    }
    return joinConsultationRoom(
      {
        db: this.db,
        rooms: this.rooms,
        budget: this.budget,
        orchestrator: this.orchestrator,
        voice: this.voice,
      },
      this.server,
      socket,
      dto.consultationId,
      dto.mode,
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.LEAVE)
  async handleLeave(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return leaveConsultationRoom(
      socket,
      dto.consultationId,
      identity,
      this.rooms,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.MEDIA_READY)
  async handleMediaReady(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.orchestrator.mediaReady(
      this.server,
      dto.consultationId,
      identity,
      socket,
    );
  }

  /**
   * Refreshes the caller's Agora voice/video token for an accepted/active consultation.
   *
   * @param _socket - Connected client realtime socket.
   * @param dto - Consultation action payload containing consultationId.
   * @param identity - Authenticated participant socket identity.
   * @returns Voice token acknowledgement payload with fresh token or ignored status.
   */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CONSULTATION.COMMANDS.VOICE_TOKEN)
  async handleVoiceToken(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: ConsultationActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return refreshVoiceToken(
      { db: this.db, voice: this.voice },
      dto.consultationId,
      identity,
    );
  }
}
