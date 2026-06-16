import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '../../infrastructure/entities/general-ledger-entry.entity';

export class QueryGeneralLedgerDto {
  @IsOptional()
  @IsString()
  event_id?: string;

  @IsOptional()
  @IsEnum(GeneralLedgerEventType)
  event_type?: GeneralLedgerEventType;

  @IsOptional()
  @IsEnum(GeneralLedgerEntryType)
  entry_type?: GeneralLedgerEntryType;

  @IsOptional()
  @IsEnum(GeneralLedgerPartyType)
  party_type?: GeneralLedgerPartyType;

  @IsOptional()
  @IsUUID()
  party_id?: string;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;

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
