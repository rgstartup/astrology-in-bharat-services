import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { EarningEventType } from '../enums';

export class QueryEarningSplitsDto {
  @IsOptional()
  @IsEnum(EarningEventType)
  event_type?: EarningEventType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  provider_profile_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  client_profile_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  beneficiary_user_id?: number;

  @IsOptional()
  @IsString()
  from_date?: string;

  @IsOptional()
  @IsString()
  to_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number;
}
