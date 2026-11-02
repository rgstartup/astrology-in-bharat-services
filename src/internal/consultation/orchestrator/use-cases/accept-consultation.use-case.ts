import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, desc } from "drizzle-orm";
import type { Server } from "socket.io";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { consultationSessions, consultations } from "@/core/drizzledb/schema";
import {
  ConsultationSessionStatus,
  ConsultationStatus,
} from "@/internal/consultation/enums";
import { PresenceService } from "@/internal/actors/expert/presence/presence.service";
import { SOCKET_EVENTS } from "@/internal/realtime/constants/socket-events.constant";
import { SOCKET_ROOMS } from "@/internal/realtime/constants/socket-rooms.constant";
import {
  VoiceService,
  VoiceTokenIssuanceFailedError,
  type VoiceTokenResult,
} from "@/external/voice";
import { ConsultationBudgetEngine } from "../consultation-budget.engine";
import {
  AcceptConsultationCommand,
  toConsultationModeType,
} from "../consultation-orchestrator.types";

type AcceptConsultationPayload = {
  consultationId: number;
  sessionId: number | undefined;
  expertId: number;
  mode: ReturnType<typeof toConsultationModeType>;
  maxMinutes: number;
  startedAt: string | null;
  timestamp: string;
  channelName?: string;
};

type MediaCredentials = {
  channelName: string;
  clientIssued: VoiceTokenResult;
  expertIssued: VoiceTokenResult;
};

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
    const [requestedConsultation] = await this.db
      .select()
      .from(consultations)
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
      .limit(1);

    if (!requestedConsultation) {
      throw new BadRequestException("Consultation cannot be accepted");
    }

    const mode = toConsultationModeType(requestedConsultation.mode);

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
      throw new BadRequestException("Consultation cannot be accepted");
    }

    // Resolve the latest PENDING consultation_session so frontend hooks can
    // filter events by sessionId on continue (same consultationId, new session).
    const [pendingSession] = await this.db
      .select()
      .from(consultationSessions)
      .where(
        and(
          eq(consultationSessions.consultation_id, consultation.id),
          eq(consultationSessions.status, ConsultationSessionStatus.PENDING),
        ),
      )
      .orderBy(desc(consultationSessions.id))
      .limit(1);

    // Mark expert busy
    await this.presence.setBusy(consultation.expert_id, consultation.id);

    const affordability = await this.budget.calculateAffordability(
      consultation.id,
      mode,
    );

    const acceptanceDetails = {
      sessionId: pendingSession?.id ?? undefined,
      maxMinutes: affordability?.maxMinutes ?? 0,
      startedAt: affordability?.startedAt ?? null,
    };

    if (mode === "chat") {
      return this.acceptChatConsultation(server, consultation, {
        ...acceptanceDetails,
        mode,
      });
    }

    return this.acceptMediaConsultation(server, consultation, {
      ...acceptanceDetails,
      mode,
    });
  }

  /**
   * Mints and validates both participant tokens before the consultation is accepted.
   * @param consultation Consultation identity and participant IDs.
   * @returns Valid media credentials for both participants.
   * @throws VoiceTokenIssuanceFailedError if either token is missing or empty.
   */
  private async createMediaCredentials(
    consultation: Pick<
      typeof consultations.$inferSelect,
      "id" | "client_id" | "expert_id"
    >,
  ): Promise<MediaCredentials> {
    const channelName = SOCKET_ROOMS.VOICE_SESSION(consultation.id);
    const [clientResult, expertResult] = await Promise.allSettled([
      this.voice.generateToken({
        identity: `client_${consultation.client_id}_consult_${consultation.id}`,
        channelName,
      }),
      this.voice.generateToken({
        identity: `expert_${consultation.expert_id}_consult_${consultation.id}`,
        channelName,
      }),
    ]);

    const clientIssued =
      clientResult.status === "fulfilled" ? clientResult.value : null;
    const expertIssued =
      expertResult.status === "fulfilled" ? expertResult.value : null;
    if (
      clientResult.status !== "fulfilled" ||
      expertResult.status !== "fulfilled"
    ) {
      throw new VoiceTokenIssuanceFailedError();
    }

    if (!clientIssued?.token || !expertIssued?.token) {
      throw new VoiceTokenIssuanceFailedError();
    }

    return { channelName, clientIssued, expertIssued };
  }

  /**
   * Broadcasts a chat acceptance to the consultation and participant rooms.
   * @param consultation Accepted consultation identity and participant IDs.
   * @param server Authoritative Socket.IO server instance.
   * @param acceptance Session and affordability details for the accepted event.
   * @returns Confirmation status and consultation identifier.
   */
  private acceptChatConsultation(
    server: Server,
    consultation: Pick<
      typeof consultations.$inferSelect,
      "id" | "client_id" | "expert_id"
    >,
    acceptance: Omit<
      Pick<
        AcceptConsultationPayload,
        "sessionId" | "mode" | "maxMinutes" | "startedAt"
      >,
      "mode"
    > & { mode: "chat" },
  ) {
    const payload: AcceptConsultationPayload = {
      consultationId: consultation.id,
      expertId: consultation.expert_id,
      ...acceptance,
      timestamp: new Date().toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(consultation.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ACCEPTED, payload);
    server
      .to(SOCKET_ROOMS.CLIENT(consultation.client_id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ACCEPTED, payload);
    server
      .to(SOCKET_ROOMS.EXPERT(consultation.expert_id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ACCEPTED, payload);

    return { status: "accepted", consultationId: consultation.id };
  }

  /**
   * Issues media credentials and broadcasts acceptance for voice or video.
   * @param consultation Accepted consultation identity and participant IDs.
   * @param server Authoritative Socket.IO server instance.
   * @param acceptance Session and affordability details for the accepted event.
   * @returns Confirmation status and any successfully issued expert token.
   */
  private async acceptMediaConsultation(
    server: Server,
    consultation: Pick<
      typeof consultations.$inferSelect,
      "id" | "client_id" | "expert_id"
    >,
    acceptance: Omit<
      Pick<
        AcceptConsultationPayload,
        "sessionId" | "mode" | "maxMinutes" | "startedAt"
      >,
      "mode"
    > & { mode: "voice" | "video" },
  ) {
    const mediaCredentials = await this.createMediaCredentials(consultation);

    if (!mediaCredentials) throw new VoiceTokenIssuanceFailedError();

    const { channelName, clientIssued, expertIssued } = mediaCredentials;

    const payload: AcceptConsultationPayload = {
      consultationId: consultation.id,
      expertId: consultation.expert_id,
      ...acceptance,
      timestamp: new Date().toISOString(),
      channelName,
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(consultation.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ACCEPTED, payload);

    // Keep media credentials private to each participant's personal room.
    // These verdicts go to both sides for every mode, including after reconnect.
    server
      .to(SOCKET_ROOMS.CLIENT(consultation.client_id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ACCEPTED, {
        ...payload,
        ...(clientIssued
          ? {
              token: clientIssued.token,
              tokenExpiresAt: clientIssued.expiresAt.toISOString(),
            }
          : {}),
      });
    server
      .to(SOCKET_ROOMS.EXPERT(consultation.expert_id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ACCEPTED, {
        ...payload,
        ...(expertIssued
          ? {
              token: expertIssued.token,
              tokenExpiresAt: expertIssued.expiresAt.toISOString(),
            }
          : {}),
      });

    return {
      status: "accepted",
      consultationId: consultation.id,
      ...(expertIssued
        ? {
            token: expertIssued.token,
            tokenExpiresAt: expertIssued.expiresAt.toISOString(),
            channelName,
          }
        : {}),
    };
  }
}
