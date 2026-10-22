import { Injectable } from '@nestjs/common';
import { CheckVoiceEligibilityUsecase } from './use-cases/check-voice-eligibility.usecase';
import { GetVoiceTokenUsecase } from './use-cases/get-voice-token.usecase';
import { VoiceEligibilityResponseDto } from './dto/voice-eligibility-response.dto';
import { VoiceTokenResponseDto } from './dto/voice-token-response.dto';

/**
 * Voice entry point for client consultations.
 *
 * Responsibilities:
 * - Delegate voice eligibility and voice-token flows to their
 *   single-responsibility use-cases.
 * - Initiation is owned by `ClientConsultationService` via
 *   `InitiateConsultationUsecase` (mode-agnostic).
 */
@Injectable()
export class ClientVoiceService {
  constructor(
    private readonly checkVoiceEligibilityUsecase: CheckVoiceEligibilityUsecase,
    private readonly getVoiceTokenUsecase: GetVoiceTokenUsecase,
  ) {}

  checkEligibility(
    clientId: number,
    expertId: number,
  ): Promise<VoiceEligibilityResponseDto> {
    return this.checkVoiceEligibilityUsecase.execute(clientId, expertId);
  }

  getVoiceToken(
    clientId: number,
    consultationId: number,
  ): Promise<VoiceTokenResponseDto> {
    return this.getVoiceTokenUsecase.execute(clientId, consultationId);
  }
}
