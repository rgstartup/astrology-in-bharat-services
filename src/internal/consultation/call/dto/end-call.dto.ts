import { IsString, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class EndCallDto {
  @IsInt()
  @Type(() => Number)
  sessionId!: number;

  @IsOptional()
  @IsString()
  endedBy?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
