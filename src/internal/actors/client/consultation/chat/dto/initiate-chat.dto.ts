import { IsInt, IsObject, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class InitiateChatDto {
  @IsInt()
  @Type(() => Number)
  expert_id!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  consultation_id?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
