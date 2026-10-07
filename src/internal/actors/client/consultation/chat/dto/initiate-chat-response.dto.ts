import { IsInt, Min } from 'class-validator';

export class InitiateChatResponseDto {
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
