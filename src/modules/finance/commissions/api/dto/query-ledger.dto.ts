import { IsEnum, IsOptional, IsUUID, IsDateString, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LedgerReferenceType } from '@/modules/finance/commissions/infrastructure/entities/ledger-entry.entity';

export class QueryLedgerDto {
  @IsOptional()
  @IsEnum(LedgerReferenceType)
  reference_type?: LedgerReferenceType;

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

export class QueryLedgerSummaryDto {
  @IsOptional()
  @IsEnum(LedgerReferenceType)
  reference_type?: LedgerReferenceType;

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
