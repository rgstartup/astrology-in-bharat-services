import { IsOptional, IsString } from 'class-validator';

export class TerminateSessionDto {
  @IsOptional()
  @IsString()
  userMessage?: string;

  @IsOptional()
  @IsString()
  expertMessage?: string;
}
