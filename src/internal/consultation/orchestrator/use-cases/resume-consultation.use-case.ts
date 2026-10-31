import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultationSessions, consultations } from '@/core/drizzledb/schema';
import {
  ConsultationSessionStatus,
} from '@/internal/consultation/enums';
import { ConsultationRoomRepository } from '@/internal/consultation/room/consultation-room.repository';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { VoiceService } from '@/external/voice';
import { ConsultationBudgetEngine } from '../consultation-budget.engine';
import { ChatModeAdapter } from '../adapters/chat-mode.adapter';
import { VoiceModeAdapter } from '../adapters/voice-mode.adapter';
import { VideoModeAdapter } from '../adapters/video-mode.adapter';
import {
  ConsultationModeType,
  ConsultationResumedAckPayload,
  IConsultationModeAdapter,
  ResumeConsultationCommand,
  toConsultationModeEnum,
  toConsultationModeType,
} from '../consultation-orchestrator.types';

/**
 * Resumes a paused consultation after client recharge or manual resume.
 *
 * Responsibilities:
 * - Validate that client wallet holds sufficient balance for continuation (>= ratePerMinute).
 * - Support mode-separated resumption (chat, voice, video) or cross-mode resume.
 * - Generate Agora RTC credentials for voice/video resumption.
 * - Delegate resume to the target mode adapter (`onResume`): re-anchor the
 *   billing clock carrying base consumed seconds forward and clear the pause key.
 * - Broadcast mode-specific resume event (`consultation:resumed:chat|voice|video`),
 *   legacy `consultation:resumed`, and `consultation:budget:restored`.
 */
@Injectable()
export class ResumeConsultationUseCase {
  private readonly adapters: Map<
    ConsultationModeType,
    IConsultationModeAdapter
  >;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly budget: ConsultationBudgetEngine,
    private readonly rooms: ConsultationRoomRepository,
    private readonly voice: VoiceService,
    chatAdapter: ChatModeAdapter,
    voiceAdapter: VoiceModeAdapter,
    videoAdapter: VideoModeAdapter,
  ) {
    this.adapters = new Map<ConsultationModeType, IConsultationModeAdapter>([
      ['chat', chatAdapter],
      ['voice', voiceAdapter],
      ['video', videoAdapter],
    ]);
  }

  private getAdapter(mode: ConsultationModeType): IConsultationModeAdapter {
    const adapter = this.adapters.get(mode);
    if (!adapter) throw new BadRequestException(`Unsupported mode: ${mode}`);
    return adapter;
  }

  /**
   * Executes the resume consultation workflow.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param command - Command containing consultationId, participant actor info, and optional targetMode.
   * @returns Updated consultation state payload reflecting active status and optional credentials.
   * @throws NotFoundException If consultation does not exist.
   * @throws BadRequestException If client wallet does not have sufficient balance.
   */
  async execute(
    server: Server,
    command: ResumeConsultationCommand,
  ): Promise<ConsultationResumedAckPayload> {
    const [row] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, command.consultationId))
      .limit(1);

    if (!row) throw new NotFoundException('Consultation not found');

    const previousMode = toConsultationModeType(row.mode);
    const mode = command.targetMode ?? previousMode;
    const isModeSwitch =
      command.targetMode !== undefined && command.targetMode !== previousMode;

    const billingHeld = await this.rooms.isBillingHeld(row.id);
    const affordability = await this.budget.calculateAffordability(
      row.id,
      mode,
    );

    if (!affordability || affordability.remainingSeconds <= 0) {
      throw new BadRequestException(
        'Insufficient balance to resume consultation',
      );
    }

    const now = new Date();
    const startedAt = now.toISOString();

    // If switching mode, update consultation mode in database and close previous sessions
    if (isModeSwitch) {
      await this.db
        .update(consultations)
        .set({
          mode: toConsultationModeEnum(mode),
          updated_at: now,
        })
        .where(eq(consultations.id, row.id));

      await this.db
        .update(consultationSessions)
        .set({
          status: ConsultationSessionStatus.COMPLETED,
          ended_at: now,
          updated_at: now,
        })
        .where(
          and(
            eq(consultationSessions.consultation_id, row.id),
            eq(consultationSessions.status, ConsultationSessionStatus.ACTIVE),
          ),
        );
    }

    // A resume starts a new session for the target mode. The previous row was
    // closed by the pause (or mode switch above), so history shows both boundaries.
    const [activeSession] = await this.db
      .select({ id: consultationSessions.id })
      .from(consultationSessions)
      .where(
        and(
          eq(consultationSessions.consultation_id, row.id),
          eq(consultationSessions.status, ConsultationSessionStatus.ACTIVE),
          eq(consultationSessions.mode, toConsultationModeEnum(mode)),
        ),
      )
      .limit(1);

    let activeSessionId = activeSession?.id ?? null;
    if (!activeSession) {
      const [inserted] = await this.db
        .insert(consultationSessions)
        .values({
          consultation_id: row.id,
          mode: toConsultationModeEnum(mode),
          status: ConsultationSessionStatus.ACTIVE,
          started_at: now,
          created_at: now,
          updated_at: now,
        })
        .returning({ id: consultationSessions.id });
      activeSessionId = inserted?.id ?? null;
    }

    // Dialog-driven holds only froze the clock: release them before re-anchoring.
    if (billingHeld) {
      await this.rooms.clearBillingHold(row.id);
    }

    // If mode changed, initialize adapter for new mode
    if (isModeSwitch && this.getAdapter(mode).onStart) {
      await this.getAdapter(mode).onStart!(row.id, { id: activeSessionId });
    }

    await this.getAdapter(mode).onResume(row.id, {
      anchorIso: startedAt,
      baseSeconds: affordability.elapsedSeconds,
    });

    // Mint Agora media tokens for voice or video resumption
    const channelName =
      mode === 'voice' || mode === 'video'
        ? SOCKET_ROOMS.VOICE_SESSION(row.id)
        : undefined;

    let clientToken: string | undefined;
    let expertToken: string | undefined;
    let tokenExpiresAt: string | undefined;

    if (channelName) {
      const [clientIssued, expertIssued] = await Promise.all([
        this.voice
          .generateToken({
            identity: `client_${row.client_id}_consult_${row.id}`,
            channelName,
          })
          .catch(() => null),
        this.voice
          .generateToken({
            identity: `expert_${row.expert_id}_consult_${row.id}`,
            channelName,
          })
          .catch(() => null),
      ]);

      clientToken = clientIssued?.token;
      expertToken = expertIssued?.token;
      tokenExpiresAt =
        clientIssued?.expiresAt?.toISOString() ??
        expertIssued?.expiresAt?.toISOString();

      const targetedModeEvent =
        mode === 'voice'
          ? SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED_VOICE
          : SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED_VIDEO;

      // Targeted token delivery to client & expert private rooms
      if (clientIssued) {
        server.to(SOCKET_ROOMS.CLIENT(row.client_id)).emit(targetedModeEvent, {
          consultationId: row.id,
          mode,
          state: 'active',
          token: clientIssued.token,
          tokenExpiresAt: clientIssued.expiresAt.toISOString(),
          channelName,
          startedAt,
          elapsedSeconds: affordability.elapsedSeconds,
          maxMinutes: affordability.maxMinutes,
          ratePerMinute: affordability.ratePerMinute,
          timestamp: now.toISOString(),
        });
      }
      if (expertIssued) {
        server.to(SOCKET_ROOMS.EXPERT(row.expert_id)).emit(targetedModeEvent, {
          consultationId: row.id,
          mode,
          state: 'active',
          token: expertIssued.token,
          tokenExpiresAt: expertIssued.expiresAt.toISOString(),
          channelName,
          startedAt,
          elapsedSeconds: affordability.elapsedSeconds,
          maxMinutes: affordability.maxMinutes,
          ratePerMinute: affordability.ratePerMinute,
          timestamp: now.toISOString(),
        });
      }
    }

    // Public room payload without secret tokens
    const publicPayload: ConsultationResumedAckPayload = {
      consultationId: row.id,
      mode,
      state: 'active',
      startedAt,
      elapsedSeconds: affordability.elapsedSeconds,
      maxMinutes: affordability.maxMinutes,
      ratePerMinute: affordability.ratePerMinute,
      timestamp: now.toISOString(),
      ...(channelName ? { channelName } : {}),
    };

    // Broadcast mode-separated event to consultation room
    const modeEvent =
      mode === 'chat'
        ? SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED_CHAT
        : mode === 'voice'
          ? SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED_VOICE
          : SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED_VIDEO;

    server.to(SOCKET_ROOMS.CONSULTATION(row.id)).emit(modeEvent, publicPayload);

    // Broadcast universal legacy event and budget restoration to consultation room
    server
      .to(SOCKET_ROOMS.CONSULTATION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED, publicPayload);
    server
      .to(SOCKET_ROOMS.CONSULTATION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.BUDGET.RESTORED, publicPayload);

    // Return ack payload including credentials for the caller
    const callerToken =
      command.actorType === 'expert' ? expertToken : clientToken;
    return {
      ...publicPayload,
      ...(callerToken ? { token: callerToken, tokenExpiresAt } : {}),
    };
  }
}
