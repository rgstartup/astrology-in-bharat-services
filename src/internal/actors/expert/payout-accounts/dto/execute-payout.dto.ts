import { IsInt, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ExecutePayoutDto {
  @IsInt()
  @Type(() => Number)
  payoutAccountId: number;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  narration?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
