import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientJwtAuthGuard } from '@/internal/actors/client/auth/guards/auth.guard';
import { CurrentClient } from '@/internal/actors/client/auth/decorators/current-client.decorator';
import { ClientVoiceService } from '../voice.service';
import { ClientConsultationService } from '../../consultation.service';
import { InitiateVoiceDto } from '../dto/initiate-voice.dto';
import { InitiateVoiceResponseDto } from '../dto/initiate-voice-response.dto';
import { VoiceEligibilityResponseDto } from '../dto/voice-eligibility-response.dto';
import { VoiceTokenResponseDto } from '../dto/voice-token-response.dto';

@Controller({
  path: 'client/voice',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class ClientVoiceController {
  constructor(
    private readonly clientVoiceService: ClientVoiceService,
    private readonly consultationService: ClientConsultationService,
  ) {}

  /**
   * @deprecated Use `POST /v1/client/consultations/initiate` with
   * `{ mode: 'voice' }` instead. Thin wrapper over the single service.
   */
  @Post('initiate')
  async initiateVoice(
    @CurrentClient('id') clientId: number,
    @Body() dto: InitiateVoiceDto,
  ): Promise<InitiateVoiceResponseDto> {
    const session = await this.consultationService.initiateConsultation(
      clientId,
      dto.expert_id,
      'voice',
      dto?.consultation_id,
    );

    return session;
  }

  @Get('eligibility')
  async checkEligibility(
    @CurrentClient('id') clientId: number,
    @Query('expertId', ParseIntPipe) expertId: number,
  ): Promise<VoiceEligibilityResponseDto> {
    return this.clientVoiceService.checkEligibility(clientId, expertId);
  }

  @Get('token/:consultationId')
  async getVoiceToken(
    @CurrentClient('id') clientId: number,
    @Param('consultationId', ParseIntPipe) consultationId: number,
  ): Promise<VoiceTokenResponseDto> {
    return this.clientVoiceService.getVoiceToken(clientId, consultationId);
  }
}
