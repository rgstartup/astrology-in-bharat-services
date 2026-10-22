import { IsIn, IsInt, IsObject, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { ConsultationModeType } from '@/internal/consultation/orchestrator/consultation-orchestrator.types';

export class InitiateConsultationDto {
  @IsInt()
  @Type(() => Number)
  expert_id!: number;

  /**
   * Requested consultation mode. Video has no initiate core yet —
   * rejected with 400 until one exists.
   */
  @IsIn(['chat', 'voice'])
  mode!: ConsultationModeType;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  consultation_id?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class InitiateConsultationResponseDto {
  @IsInt()
  consultationId!: number;

  @IsInt()
  sessionId!: number;

  @IsInt()
  @Min(0)
  maxMinutes!: number;

  /** Request window in seconds — drives the client waiting countdown. */
  @IsInt()
  @Min(1)
  requestExpiresInSec!: number;
}
