import { IsOptional, IsString } from 'class-validator';

export class GetExpertEarningsStatsDto {
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
