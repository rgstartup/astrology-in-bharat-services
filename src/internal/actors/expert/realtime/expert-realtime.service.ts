import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import {
  consultationDisconnectGrace,
  consultationDisconnectGraceMs,
  hasLiveActorSocket,
} from '@/internal/realtime/room/consultation-disconnect-grace';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import type {
  AuthenticatedSocketIdentity,
  ExpertSocketIdentity,
} from '@/internal/realtime/types/socket-auth.types';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';
import type { ConsultationModeType } from '@/internal/consultation/orchestrator/consultation-orchestrator.types';
import { toConsultationModeType } from '@/internal/consultation/orchestrator/consultation-orchestrator.types';
import { ConsultationRoomRepository } from '@/internal/consultation/room/consultation-room.repository';
import { ResolveConsultationBudgetUseCase } from '@/internal/consultation/room/resolve-consultation-budget.use-case';
import { MarkConsultationSessionStartedUseCase } from '@/internal/consultation/room/mark-consultation-session-started.use-case';
import { ConsultationOrchestratorService } from '@/internal/consultation/orchestrator/consultation-orchestrator.service';
import { VoiceService } from '@/external/voice';
import {
  joinConsultationRoom,
  leaveConsultationRoom,
  refreshVoiceToken,
} from '@/internal/realtime/room/consultation-room-membership';
import { ExpertPresenceHandler } from './handlers/expert-presence.handler';
import { ExpertNotificationHandler } from './handlers/expert-notification.handler';
import { ExpertChatHandler } from './handlers/expert-chat.handler';
import { ConsultationStatus } from '@/internal/consultation/enums';

interface ChatMessageInput {
  consultationId: number;
  content: string;
  attachmentMediaId?: number;
  attachmentUrl?: string;
  attachmentType?: string;
}

@Injectable()
export class ExpertRealtimeService {
  private readonly logger = new Logger(ExpertRealtimeService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly presenceHandler: ExpertPresenceHandler,
    private readonly notificationHandler: ExpertNotificationHandler,
    private readonly chatHandler: ExpertChatHandler,
    private readonly rooms: ConsultationRoomRepository,
    private readonly budget: ResolveConsultationBudgetUseCase,
    private readonly markStarted: MarkConsultationSessionStartedUseCase,
    private readonly orchestrator: ConsultationOrchestratorService,
    private readonly voice: VoiceService,
  ) {}

  async handleExpertConnect(
    socket: RealtimeSocket,
    identity: ExpertSocketIdentity,
    server: Server,
  ): Promise<void> {
    // Rejoined inside the disconnect grace window — cancel the deferred
    // session close so a refresh never ends the consultation.
    consultationDisconnectGrace.cancel('expert', identity.expertId);

    // Resume billing on any consultation that was ACTIVE when the socket
    // dropped. The timer was paused on disconnect; re-arming it continues
    // from the frozen elapsed time via calculateAffordability.
    await this.resumeActiveConsultationTimers(server, identity.expertId);

    const expertRoom = SOCKET_ROOMS.EXPERT(identity.expertId);
    await socket.join(expertRoom);

    try {
      await this.presenceHandler.registerConnection(
        identity.expertId,
        socket.id,
      );
    } catch (err) {
      this.logger.error(
        `[ExpertRealtime] Failed to register presence for expert ${identity.expertId}: ${(err as Error).message}`,
      );
    }

    this.logger.log(
      `[ExpertRealtime] Expert ${identity.expertId} joined room ${expertRoom} (socket: ${socket.id})`,
    );
  }

  async handleExpertDisconnect(
    socket: RealtimeSocket,
    identity: ExpertSocketIdentity,
    server: Server,
  ): Promise<void> {
    try {
      await this.presenceHandler.unregisterConnection(
        identity.expertId,
        socket.id,
      );
    } catch (err) {
      this.logger.error(
        `[ExpertRealtime] Failed to unregister presence for expert ${identity.expertId}: ${(err as Error).message}`,
      );
    }

    // Another tab still live → not a real leave; a refresh rejoins inside
    // the grace window (cancelled on connect), so the session survives.
    if (hasLiveActorSocket(server, 'expert', identity.expertId)) return;

    // Pause billing on any ACTIVE consultation this expert is in. The timer
    // is cancelled (not destroyed) so disconnect time is not charged; resume
    // re-arms it from the frozen elapsed time when the expert reconnects.
    const pausedConsultationIds = await this.pauseActiveConsultationTimers(
      identity.expertId,
    );

    // Tell the peer to freeze its timer/grace UI so the clock stops on both
    // sides while the disconnect grace window runs. Session stays ACTIVE;
    // the grace arm below handles resume-or-end.
    const pauseExpiresInSec = Math.floor(consultationDisconnectGraceMs() / 1000);
    for (const consultationId of pausedConsultationIds) {
      server
        .to(SOCKET_ROOMS.CONSULTATION(consultationId))
        .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.PAUSED, {
          consultationId,
          reason: "expert_disconnect",
          pauseExpiresInSec,
          timestamp: new Date().toISOString(),
        });
    }

    consultationDisconnectGrace.arm(
      this.db,
      server,
      'expert',
      identity.expertId,
      { expertId: identity.expertId },
      'expert_disconnect',
    );

    this.logger.log(
      `[ExpertRealtime] Expert ${identity.expertId} disconnected (socket: ${socket.id})`,
    );
  }

  async handleHeartbeat(
    socket: RealtimeSocket,
    identity: ExpertSocketIdentity,
  ): Promise<{ status: string; timestamp: number }> {
    return this.presenceHandler.handleHeartbeat(identity.expertId, socket.id);
  }

  async subscribeExpertPresence(socket: RealtimeSocket, expertId: number) {
    return this.presenceHandler.subscribeExpertPresence(socket, expertId);
  }

  async unsubscribeExpertPresence(socket: RealtimeSocket, expertId: number) {
    return this.presenceHandler.unsubscribeExpertPresence(socket, expertId);
  }

  async subscribeNotifications(
    socket: RealtimeSocket,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.notificationHandler.subscribeNotifications(socket, identity);
  }

  async acknowledgeNotificationRead(
    notificationId: string,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.notificationHandler.acknowledgeNotificationRead(
      notificationId,
      identity,
    );
  }

  async joinConsultation(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    mode: ConsultationModeType,
    identity: AuthenticatedSocketIdentity,
  ) {
    return joinConsultationRoom(
      {
        db: this.db,
        rooms: this.rooms,
        budget: this.budget,
        orchestrator: this.orchestrator,
        markStarted: this.markStarted,
        voice: this.voice,
      },
      server,
      socket,
      consultationId,
      mode,
      identity,
    );
  }

  async leaveConsultation(
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return leaveConsultationRoom(socket, consultationId, identity, this.rooms);
  }

  /**
   * Re-issues the caller's Agora token for an accepted/active voice/video
   * consultation (expiry fallback and mid-call renew without rejoining).
   *
   * @param consultationId - ID of the live consultation.
   * @param identity - Requesting side (must participate).
   * @returns Token ack, or an ignored ack for non-participants/ended rows.
   */
  async voiceToken(
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return refreshVoiceToken(
      { db: this.db, voice: this.voice },
      consultationId,
      identity,
    );
  }

  /**
   * Records Agora readiness for voice/video; billing starts on the second
   * side's ready via the orchestrator (transition-safe).
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param consultationId - ID of the consultation going live on media.
   * @param identity - Reporting side (must participate).
   * @returns Readiness payload, or null for non-participants.
   */
  async mediaReady(
    server: Server,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.orchestrator.mediaReady(server, consultationId, identity);
  }

  async sendChatMessage(
    server: Server,
    socket: RealtimeSocket,
    input: ChatMessageInput,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.chatHandler.sendChatMessage(server, socket, input, identity);
  }

  relayChatTyping(
    socket: RealtimeSocket,
    consultationId: number,
    isTyping: boolean,
    identity: AuthenticatedSocketIdentity,
  ): void {
    this.chatHandler.relayChatTyping(
      socket,
      consultationId,
      isTyping,
      identity,
    );
  }

  async acceptChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.chatHandler.acceptChat(
      server,
      socket,
      consultationId,
      identity,
    );
  }

  async rejectChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.chatHandler.rejectChat(
      server,
      socket,
      consultationId,
      identity,
    );
  }

  async endChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.chatHandler.endChat(server, socket, consultationId, identity);
  }

  async pauseChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.chatHandler.pauseChat(server, socket, consultationId, identity);
  }

  async resumeChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.chatHandler.resumeChat(
      server,
      socket,
      consultationId,
      identity,
    );
  }

  /**
   * Cancel the budget timer on every ACTIVE consultation this expert is
   * participating in. Called on socket disconnect so disconnect time is
   * not billed. The timer is cancelled (not destroyed) — reconnect
   * re-arms it from the frozen elapsed time.
   *
   * @param expertId - Expert owning the consultations.
   * @returns IDs of the consultations whose timers were paused.
   */
  private async pauseActiveConsultationTimers(
    expertId: number,
  ): Promise<number[]> {
    const active = await this.db
      .select({ id: consultations.id })
      .from(consultations)
      .where(
        and(
          eq(consultations.expert_id, expertId),
          eq(consultations.status, ConsultationStatus.ACTIVE),
        ),
      );
    for (const row of active) {
      this.orchestrator.cancelBudgetTimer(row.id);
    }
    return active.map((row) => row.id);
  }

  /**
   * Re-arm the budget timer on every ACTIVE consultation this expert is
   * participating in. Called on reconnect inside the grace window to
   * resume billing from the frozen elapsed time.
   */
  private async resumeActiveConsultationTimers(
    server: Server,
    expertId: number,
  ): Promise<void> {
    const active = await this.db
      .select({ id: consultations.id, mode: consultations.mode })
      .from(consultations)
      .where(
        and(
          eq(consultations.expert_id, expertId),
          eq(consultations.status, ConsultationStatus.ACTIVE),
        ),
      );
    for (const row of active) {
      this.orchestrator.armBudgetTimer(
        server,
        row.id,
        toConsultationModeType(row.mode),
      );
    }
  }
}
