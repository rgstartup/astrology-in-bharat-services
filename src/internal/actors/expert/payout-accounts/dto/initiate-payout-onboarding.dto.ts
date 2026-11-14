import { IsString, IsOptional } from 'class-validator';

export class InitiatePayoutOnboardingDto {
  @IsOptional()
  @IsString()
  providerCode?: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}
