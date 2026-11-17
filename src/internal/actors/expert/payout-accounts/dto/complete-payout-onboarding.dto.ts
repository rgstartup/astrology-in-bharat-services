import { IsInt, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CompletePayoutOnboardingDto {
  @IsInt()
  @Type(() => Number)
  onboardingId: number;

  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifsc?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  state?: string;
}
