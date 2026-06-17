import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SplitReferenceType } from '@/modules/finance/commissions/infrastructure/entities/commission-split.entity';

export class QueryCommissionSplitsDto {
  @IsOptional()
  @IsEnum(SplitReferenceType)
  reference_type?: SplitReferenceType;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;

  @IsOptional()
  @IsUUID()
  provider_profile_id?: string;

  @IsOptional()
  @IsUUID()
  client_profile_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class QueryCommissionSplitsSummaryDto {
  @IsOptional()
  @IsEnum(SplitReferenceType)
  reference_type?: SplitReferenceType;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;

  @IsOptional()
  @IsUUID()
  provider_profile_id?: string;
}
