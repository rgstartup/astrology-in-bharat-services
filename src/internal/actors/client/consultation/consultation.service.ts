import { Injectable } from "@nestjs/common";
import type { ConsultationModeType } from "@/internal/consultation/orchestrator/consultation-orchestrator.types";
import { InitiateConsultationUsecase } from "@/internal/consultation/room/initiate-consultation.usecase";
import type { InitiateConsultationResponseDto } from "./dto/initiate-consultation.dto";

/**
 * Single initiate entry point for client consultations.
 *
 * Responsibilities:
 * - Route an initiate request to the single `InitiateConsultationUsecase`
 *   based on `mode`.
 * - Reject modes with no initiate core (currently `video`) with a 400
 *   instead of silently falling through.
 */
@Injectable()
export class ClientConsultationService {
  constructor(
    private readonly initiateConsultationUsecase: InitiateConsultationUsecase,
  ) {}

  /**
   * Initiates a consultation in the requested mode.
   *
   * @param clientId - ID of the requesting client.
   * @param expertId - ID of the expert to consult.
   * @param mode - Requested mode (`chat` or `voice`).
   * @param consultationId - Optional existing consultation to attach a session to.
   * @returns Initiate payload (consultation/session IDs, budget, request window).
   * @throws DomainError (mode-agnostic: PRICE_NOT_FOUND, INSUFFICIENT_BALANCE,
   *   EXPERT_UNAVAILABLE, ACTIVE_CONSULTATION_EXISTS, etc.).
   */
  initiateConsultation(
    clientId: number,
    expertId: number,
    mode: ConsultationModeType,
    consultationId?: number,
  ): Promise<InitiateConsultationResponseDto> {
    return this.initiateConsultationUsecase.execute(
      clientId,
      expertId,
      mode,
      consultationId,
    );
  }
}
