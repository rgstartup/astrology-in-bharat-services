import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { PresenceService } from '@/internal/actors/expert/presence/presence.service';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { VoiceService } from '@/external/voice';
import { ConsultationBudgetEngine } from '../consultation-budget.engine';
import {
  AcceptConsultationCommand,
  toConsultationModeType,
} from '../consultation-orchestrator.types';

/**
 * Handles accepting a requested consultation booking.
 *
 * Responsibilities:
 * - Transition consultation status from `REQUESTED` to `ACCEPTED` in DB.
 * - Set expert presence to `BUSY` via `PresenceService`.
 * - Calculate initial affordability and max available minutes via `ConsultationBudgetEngine`.
 * - Broadcast acceptance events to consultation and chat socket rooms.
 */
@Injectable()
export class AcceptConsultationUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly budget: ConsultationBudgetEngine,
    private readonly presence: PresenceService,
    private readonly voice: VoiceService,
  ) {}

  /**
   * Executes the accept consultation workflow.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param command - Command containing consultationId, expert actorId, and role.
   * @returns Object containing confirmation status and consultationId.
   * @throws BadRequestException If consultation is not in REQUESTED status or not owned by expert.
   */
  async execute(server: Server, command: AcceptConsultationCommand) {
    const [consultation] = await this.db
      .update(consultations)
      .set({
        status: ConsultationStatus.ACCEPTED,
        accepted_at: new Date(),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(consultations.id, command.consultationId),
          eq(consultations.expert_id, command.actorId),
          inArray(consultations.status, [
            ConsultationStatus.REQUESTED,
            ConsultationStatus.REOPENED,
          ]),
        ),
      )
      .returning();

    if (!consultation) {
      throw new BadRequestException('Consultation cannot be accepted');
    }

    const mode = toConsultationModeType(consultation.mode);

    // Mark expert busy
    await this.presence.setBusy(consultation.expert_id, consultation.id);

    const affordability = await this.budget.calculateAffordability(
      consultation.id,
      mode,
    );

    // Accept-time media credentials for voice/video: mint both sides now so
    // the apps can join Agora on room open instead of waiting for the first
    // socket `consultation:join`. Tokens are self-contained (expiry inside),
    // so no Redis storage — refresh is a stateless re-issue of the same
    // channel + identity (see `refreshVoiceToken`). Mint failures degrade to
    // a tokenless accept; the join-time fallback still issues per-join tokens.
    const channelName =
      mode === 'voice' || mode === 'video'
        ? SOCKET_ROOMS.VOICE_SESSION(consultation.id)
        : undefined;
    const [clientIssued, expertIssued] = channelName
      ? await Promise.all([
          this.voice
            .generateToken({
              identity: `client_${consultation.client_id}_consult_${consultation.id}`,
              channelName,
            })
            .catch(() => null),
          this.voice
            .generateToken({
              identity: `expert_${consultation.expert_id}_consult_${consultation.id}`,
              channelName,
            })
            .catch(() => null),
        ])
      : [null, null];

    const payload = {
      consultationId: consultation.id,
      expertId: consultation.expert_id,
      mode,
      maxMinutes: affordability?.maxMinutes ?? 0,
      startedAt: affordability?.startedAt ?? null,
      timestamp: new Date().toISOString(),
      ...(channelName ? { channelName } : {}),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(consultation.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ACCEPTED, payload);

    // Targeted per-side delivery: the ACCEPTED room broadcast carries no
    // secret (a token must never fan out to the whole room). Each side picks
    // its token up on its personal room, which both apps join on connect.
    // Always delivered (all modes) so both apps learn the verdict even when
    // they are not (or no longer) members of the consultation room.
    server.to(SOCKET_ROOMS.CLIENT(consultation.client_id)).emit(
      SOCKET_EVENTS.CONSULTATION.EVENTS.ACCEPTED,
      {
        ...payload,
        ...(clientIssued
          ? {
              token: clientIssued.token,
              tokenExpiresAt: clientIssued.expiresAt.toISOString(),
            }
          : {}),
      },
    );
    server.to(SOCKET_ROOMS.EXPERT(consultation.expert_id)).emit(
      SOCKET_EVENTS.CONSULTATION.EVENTS.ACCEPTED,
      {
        ...payload,
        ...(expertIssued
          ? {
              token: expertIssued.token,
              tokenExpiresAt: expertIssued.expiresAt.toISOString(),
            }
          : {}),
      },
    );

    return {
      status: 'accepted',
      consultationId: consultation.id,
      ...(channelName && expertIssued
        ? {
            token: expertIssued.token,
            tokenExpiresAt: expertIssued.expiresAt.toISOString(),
            channelName,
          }
        : {}),
    };
  }
}
