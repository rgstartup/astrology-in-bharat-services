import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import type { ConsultationModeType } from '@/internal/consultation/orchestrator/consultation-orchestrator.types';
import { toConsultationModeType } from '@/internal/consultation/orchestrator/consultation-orchestrator.types';
import { ConsultationRoomRepository } from '@/internal/consultation/room/consultation-room.repository';
import { ResolveConsultationBudgetUseCase } from '@/internal/consultation/room/resolve-consultation-budget.use-case';
import { ConsultationOrchestratorService } from '@/internal/consultation/orchestrator/consultation-orchestrator.service';
import { VoiceService } from '@/external/voice';
import {
  joinConsultationRoom,
  leaveConsultationRoom,
  refreshVoiceToken,
} from '@/internal/realtime/room/consultation-room-membership';
import {
  consultationDisconnectGrace,
  consultationDisconnectGraceMs,
  hasLiveActorSocket,
} from '@/internal/realtime/room/consultation-disconnect-grace';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import type {
  AuthenticatedSocketIdentity,
  ClientSocketIdentity,
} from '@/internal/realtime/types/socket-auth.types';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { ClientPresenceHandler } from './handlers/client-presence.handler';
import { ClientNotificationHandler } from './handlers/client-notification.handler';
import { ClientChatHandler } from './handlers/client-chat.handler';

interface ChatMessageInput {
  consultationId: number;
  content: string;
  attachmentMediaId?: number;
  attachmentUrl?: string;
  attachmentType?: string;
}

@Injectable()
export class ClientRealtimeService {
  private readonly logger = new Logger(ClientRealtimeService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly presenceHandler: ClientPresenceHandler,
    private readonly notificationHandler: ClientNotificationHandler,
    private readonly chatHandler: ClientChatHandler,
    private readonly rooms: ConsultationRoomRepository,
    private readonly budget: ResolveConsultationBudgetUseCase,
    private readonly orchestrator: ConsultationOrchestratorService,
    private readonly voice: VoiceService,
  ) {}

  async handleClientConnect(
    socket: RealtimeSocket,
    identity: ClientSocketIdentity,
    server: Server,
  ): Promise<void> {
    // Rejoined inside the disconnect grace window — cancel the deferred
    // session close so a refresh never ends the consultation.
    consultationDisconnectGrace.cancel('client', identity.clientId);

    // Resume billing on any consultation that was ACTIVE when the socket
    // dropped. The timer was paused on disconnect; re-arming it continues
    // from the frozen elapsed time via calculateAffordability.
    await this.resumeActiveConsultationTimers(server, identity.clientId);

    const clientRoom = SOCKET_ROOMS.CLIENT(identity.clientId);
    await socket.join(clientRoom);
    this.logger.log(
      `[ClientRealtime] Client ${identity.clientId} joined room ${clientRoom} (socket: ${socket.id})`,
    );
  }

  async handleClientDisconnect(
    socket: RealtimeSocket,
    identity: ClientSocketIdentity,
    server: Server,
  ): Promise<void> {
    this.logger.log(
      `[ClientRealtime] Client ${identity.clientId} disconnected (socket: ${socket.id})`,
    );
    // Another tab still live → not a real leave; a refresh rejoins inside
    // the grace window (cancelled on connect), so the session survives.
    if (hasLiveActorSocket(server, 'client', identity.clientId)) return;

    // Pause billing on any ACTIVE consultation this client is in. The timer
    // is cancelled (not destroyed) so disconnect time is not charged; resume
    // re-arms it from the frozen elapsed time when the client reconnects.
    const pausedConsultationIds = await this.pauseActiveConsultationTimers(identity.clientId);

    // Tell the peer to freeze its timer/grace UI so the clock stops on both
    // sides while the disconnect grace window runs. Session stays ACTIVE;
    // the grace arm below handles resume-or-end.
    const pauseExpiresInSec = Math.floor(consultationDisconnectGraceMs() / 1000);
    for (const consultationId of pausedConsultationIds) {
      server
        .to(SOCKET_ROOMS.CONSULTATION(consultationId))
        .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.PAUSED, {
          consultationId,
          reason: "client_disconnect",
          pauseExpiresInSec,
          timestamp: new Date().toISOString(),
        });
    }

    consultationDisconnectGrace.arm(
      this.db,
      server,
      'client',
      identity.clientId,
      { clientId: identity.clientId },
      'client_disconnect',
    );
  }

  async subscribeExpertPresence(socket: RealtimeSocket, expertId: number) {
    return this.presenceHandler.subscribeExpertPresence(socket, expertId);
  }

  async unsubscribeExpertPresence(socket: RealtimeSocket, expertId: number) {
    return this.presenceHandler.unsubscribeExpertPresence(socket, expertId);
  }

  async subscribeManyExpertPresence(
    socket: RealtimeSocket,
    expertIds: number[],
  ) {
    return this.presenceHandler.subscribeManyExpertPresence(socket, expertIds);
  }

  async unsubscribeManyExpertPresence(
    socket: RealtimeSocket,
    expertIds: number[],
  ) {
    return this.presenceHandler.unsubscribeManyExpertPresence(
      socket,
      expertIds,
    );
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

  async requestChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    expertId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.chatHandler.requestChat(
      server,
      socket,
      consultationId,
      expertId,
      identity,
    );
  }

  async cancelChat(
    server: Server,
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ) {
    return this.chatHandler.cancelChat(
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
   * Cancel the budget timer on every ACTIVE consultation this client is
   * participating in. Called on socket disconnect so disconnect time is
   * not billed. The timer is cancelled (not destroyed) — reconnect
   * re-arms it from the frozen elapsed time.
   *
   * @param clientId - Client owning the consultations.
   * @returns IDs of the consultations whose timers were paused.
   */
  private async pauseActiveConsultationTimers(
    clientId: number,
  ): Promise<number[]> {
    const active = await this.db
      .select({ id: consultations.id })
      .from(consultations)
      .where(
        and(
          eq(consultations.client_id, clientId),
          eq(consultations.status, ConsultationStatus.ACTIVE),
        ),
      );
    for (const row of active) {
      this.orchestrator.cancelBudgetTimer(row.id);
    }
    return active.map((row) => row.id);
  }

  /**
   * Re-arm the budget timer on every ACTIVE consultation this client is
   * participating in. Called on reconnect inside the grace window to
   * resume billing from the frozen elapsed time.
   */
  private async resumeActiveConsultationTimers(
    server: Server,
    clientId: number,
  ): Promise<void> {
    const active = await this.db
      .select({ id: consultations.id, mode: consultations.mode })
      .from(consultations)
      .where(
        and(
          eq(consultations.client_id, clientId),
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
