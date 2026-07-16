import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  IsInt,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CommissionEventType,
  CommissionType,
  CommissionRateType,
  CommissionAppliesRole,
} from '@/modules/finance/commissions/infrastructure/entities/commission-rule.entity';

export class CreateCommissionTierDto {
  @IsNumber()
  @Min(0)
  from_amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  to_amount?: number | null;

  @IsNumber()
  @Min(0)
  rate!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_cap?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_cap?: number | null;
}

export class CreateCommissionRuleDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsEnum(CommissionEventType)
  event_type!: CommissionEventType;

  @IsEnum(CommissionType)
  commission_type!: CommissionType;

  @IsNumber()
  @Min(0)
  rate!: number;

  @IsOptional()
  @IsEnum(CommissionRateType)
  rate_type?: CommissionRateType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_cap?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_cap?: number | null;

  @IsOptional()
  @IsEnum(CommissionAppliesRole)
  applies_to_role?: CommissionAppliesRole;

  @IsOptional()
  @IsUUID()
  applies_to_id?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @IsOptional()
  @IsDateString()
  effective_until?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCommissionTierDto)
  tiers?: CreateCommissionTierDto[];
}
