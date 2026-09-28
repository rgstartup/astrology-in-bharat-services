import { IsInt, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class InitiateChatDto {
  @IsInt()
  @Type(() => Number)
  expert_id!: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
