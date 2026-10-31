import { IsIn, IsInt, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import type { ConsultationModeType } from '@/internal/consultation/orchestrator/consultation-orchestrator.types';

export class JoinRoomDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;

  @IsOptional()
  @IsIn(['chat', 'voice', 'video'])
  mode?: ConsultationModeType = 'chat';
}

export class LeaveRoomDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;
}

export class MediaReadyDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;
}

export class VoiceTokenDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;
}

export class ResumeRoomDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;

  @IsOptional()
  @IsIn(['chat', 'voice', 'video'])
  mode?: ConsultationModeType;
}
