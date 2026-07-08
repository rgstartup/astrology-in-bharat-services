import { IsString, IsOptional } from 'class-validator';

export class EndCallDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  endedBy?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
