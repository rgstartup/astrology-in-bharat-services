import { IsBoolean, IsInt, IsNumber, Min } from 'class-validator';

export class ChatEligibilityResponseDto {
  @IsBoolean()
  isEligibleForFree!: boolean;

  @IsInt()
  @Min(0)
  freeMinutes!: number;

  @IsBoolean()
  hasBalance!: boolean;

  @IsNumber()
  @Min(0)
  minBalanceRequired!: number;

  @IsNumber()
  currentBalance!: number;

  @IsNumber()
  @Min(0)
  chatPrice!: number;

  @IsBoolean()
  expertIsAvailable!: boolean;
}
