import { IsString, IsOptional, IsObject } from 'class-validator';

export class InitiateChatDto {
  @IsString()
  expert_id: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
