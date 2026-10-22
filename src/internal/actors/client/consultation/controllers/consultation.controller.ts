import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ClientJwtAuthGuard } from '@/internal/actors/client/auth/guards/auth.guard';
import { CurrentClient } from '@/internal/actors/client/auth/decorators/current-client.decorator';
import { ClientConsultationService } from '../consultation.service';
import {
  InitiateConsultationDto,
  InitiateConsultationResponseDto,
} from '../dto/initiate-consultation.dto';

@Controller({
  path: 'client/consultations',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class ClientConsultationController {
  constructor(
    private readonly consultationService: ClientConsultationService,
  ) {}

  /**
   * Single initiate endpoint for all consultation modes.
   *
   * Replaces `POST /v1/client/chat/initiate` and
   * `POST /v1/client/voice/initiate` (kept as deprecated aliases).
   *
   * @param clientId - ID of the requesting client (from JWT).
   * @param dto - Expert, mode (`chat` | `voice`), optional consultation ID.
   * @returns Initiate payload (consultation/session IDs, budget, request window).
   */
  @Post('initiate')
  async initiateConsultation(
    @CurrentClient('id') clientId: number,
    @Body() dto: InitiateConsultationDto,
  ): Promise<InitiateConsultationResponseDto> {
    return this.consultationService.initiateConsultation(
      clientId,
      dto.expert_id,
      dto.mode,
      dto?.consultation_id,
    );
  }
}
