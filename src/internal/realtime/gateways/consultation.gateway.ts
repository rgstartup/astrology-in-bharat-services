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
import type { ConsultationModeType, MediaControlCommand } from '@/internal/consultation/orchestrator/consultation-orchestrator.types';
import { CANCEL_DIALOG_GRACE_SECONDS } from '@/internal/consultation/orchestrator/consultation-orchestrator.types';
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
import { appendRealtimeLog } from '../logger';
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

/** Media control DTOs */
class MediaControlDto {
  @IsNumber()
  @IsNotEmpty()
  consultationId!: number;
}

class PauseTimerDto extends MediaControlDto {
  /** 'cancel_dialog' arms the server-side grace window for the cancel dialog. */
  @IsString()
  @IsOptional()
  intent?: string;
}

class SwitchCameraDto extends MediaControlDto {
  @IsString()
  @IsOptional()
  cameraId?: string;
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
    const msg =
      '[ConsultationGateway] Initialized on namespace /realtime';
    this.logger.log(msg);
    appendRealtimeLog(msg);
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
    const actorType =
      identity.actorType === 'client' ? 'client' : 'expert';
    const payload = await this.orchestrator.pause(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType,
      reason: billingHold ? 'billing_hold' : 'manual',
    });
    // Pause local media for voice/video consultations when billing freezes.
    if (payload) {
      await this.toggleMediaOnPause(payload.mode, {
        consultationId: dto.consultationId,
        actorId,
        actorType,
      });
    }
    return payload;
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
    const actorType =
      identity.actorType === 'client' ? 'client' : 'expert';
    const result = await this.orchestrator.resume(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType,
      targetMode: dto.mode,
    });
    // Unmute local media for voice/video consultations when billing resumes.
    await this.toggleMediaOnResume(result.mode, {
      consultationId: dto.consultationId,
      actorId,
      actorType,
    });
    return result;
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
    const actorType =
      identity.actorType === 'client' ? 'client' : 'expert';
    const result = await this.orchestrator.resume(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType,
      targetMode: 'voice',
    });
    // Unmute local media when resuming a voice consultation.
    await this.toggleMediaOnResume(result.mode, {
      consultationId: dto.consultationId,
      actorId,
      actorType,
    });
    return result;
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
    const actorType =
      identity.actorType === 'client' ? 'client' : 'expert';
    const result = await this.orchestrator.resume(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType,
      targetMode: 'video',
    });
    // Unmute local media and toggle camera when resuming a video consultation.
    await this.toggleMediaOnResume(result.mode, {
      consultationId: dto.consultationId,
      actorId,
      actorType,
    });
    return result;
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

  // =========================================================================
  // Media Control Handlers
  // =========================================================================

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.MEDIA_CONTROL.COMMANDS.MUTE_MIC)
  async handleMuteMic(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: MediaControlDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.orchestrator.muteMic(this.server, {
      consultationId: dto.consultationId,
      actorId: identity.actorType === 'expert' ? identity.expertId : identity.id,
      actorType: identity.actorType,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.MEDIA_CONTROL.COMMANDS.UNMUTE_MIC)
  async handleUnmuteMic(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: MediaControlDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.orchestrator.unmuteMic(this.server, {
      consultationId: dto.consultationId,
      actorId: identity.actorType === 'expert' ? identity.expertId : identity.id,
      actorType: identity.actorType,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.MEDIA_CONTROL.COMMANDS.MUTE_SPEAKER)
  async handleMuteSpeaker(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: MediaControlDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.orchestrator.muteSpeaker(this.server, {
      consultationId: dto.consultationId,
      actorId: identity.actorType === 'expert' ? identity.expertId : identity.id,
      actorType: identity.actorType,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.MEDIA_CONTROL.COMMANDS.UNMUTE_SPEAKER)
  async handleUnmuteSpeaker(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: MediaControlDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.orchestrator.unmuteSpeaker(this.server, {
      consultationId: dto.consultationId,
      actorId: identity.actorType === 'expert' ? identity.expertId : identity.id,
      actorType: identity.actorType,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.MEDIA_CONTROL.COMMANDS.PAUSE_TIMER)
  async handlePauseTimer(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: PauseTimerDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    // Timer pause goes through existing orchestrator.pause with billing_hold reason
    const actorId =
      identity.actorType === 'expert' ? identity.expertId : identity.id;
    const actorType =
      identity.actorType === 'client' ? 'client' : 'expert';
    const payload = await this.orchestrator.pause(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType,
      reason: 'billing_hold',
      graceSeconds:
        dto.intent === 'cancel_dialog' ? CANCEL_DIALOG_GRACE_SECONDS : undefined,
    });
    // Pause local media for voice/video consultations when the timer freezes.
    if (payload) {
      await this.toggleMediaOnPause(payload.mode, {
        consultationId: dto.consultationId,
        actorId,
        actorType,
      });
    }
    return payload;
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.MEDIA_CONTROL.COMMANDS.RESUME_TIMER)
  async handleResumeTimer(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: MediaControlDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    // Timer resume goes through existing orchestrator.resume
    const actorId =
      identity.actorType === 'expert' ? identity.expertId : identity.id;
    const actorType =
      identity.actorType === 'client' ? 'client' : 'expert';
    const result = await this.orchestrator.resume(this.server, {
      consultationId: dto.consultationId,
      actorId,
      actorType,
    });
    // Unmute local media for voice/video consultations when the timer resumes.
    await this.toggleMediaOnResume(result.mode, {
      consultationId: dto.consultationId,
      actorId,
      actorType,
    });
    return result;
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.MEDIA_CONTROL.COMMANDS.SWITCH_CAMERA)
  async handleSwitchCamera(
    @ConnectedSocket() _socket: RealtimeSocket,
    @MessageBody() dto: SwitchCameraDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.orchestrator.switchCamera(this.server, {
      consultationId: dto.consultationId,
      actorId: identity.actorType === 'expert' ? identity.expertId : identity.id,
      actorType: identity.actorType,
      cameraId: dto.cameraId,
    });
  }

  /**
   * Mutes mic and speaker (and toggles camera for video) when a voice/video
   * consultation is paused. Chat consultations have no media to mute.
   */
  private async toggleMediaOnPause(
    mode: ConsultationModeType,
    command: MediaControlCommand,
  ): Promise<void> {
    if (mode !== 'voice' && mode !== 'video') return;
    await this.orchestrator.muteMic(this.server, command);
    await this.orchestrator.muteSpeaker(this.server, command);
    if (mode === 'video') {
      await this.orchestrator.switchCamera(this.server, {
        ...command,
        cameraId: undefined,
      });
    }
  }

  /**
   * Unmutes mic and speaker (and toggles camera for video) when a voice/video
   * consultation resumes. Chat consultations have no media to unmute.
   */
  private async toggleMediaOnResume(
    mode: ConsultationModeType,
    command: MediaControlCommand,
  ): Promise<void> {
    if (mode !== 'voice' && mode !== 'video') return;
    await this.orchestrator.unmuteMic(this.server, command);
    await this.orchestrator.unmuteSpeaker(this.server, command);
    if (mode === 'video') {
      await this.orchestrator.switchCamera(this.server, {
        ...command,
        cameraId: undefined,
      });
    }
  }
}
