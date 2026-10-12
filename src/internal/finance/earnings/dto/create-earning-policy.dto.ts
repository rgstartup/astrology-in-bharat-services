import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EarningEventType, EarningRateType, EarningAppliesRole } from '../enum';

export class CreateEarningTierDto {
  @IsNumber()
  min_threshold!: number;

  @IsOptional()
  @IsNumber()
  max_threshold?: number | null;

  @IsNumber()
  platform_rate!: number;

  @IsOptional()
  @IsNumber()
  agent_rate?: number;
}

export class CreateEarningPolicyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  effective_from?: string | Date;

  @IsOptional()
  @IsString()
  effective_to?: string | Date;

  @IsOptional()
  @IsEnum(EarningEventType)
  event_type?: EarningEventType;

  @IsOptional()
  @IsEnum(EarningRateType)
  platform_cut_type?: EarningRateType;

  @IsOptional()
  @IsNumber()
  platform_cut_value?: number;

  @IsOptional()
  @IsNumber()
  buyer_platform_fee?: number;

  @IsOptional()
  @IsNumber()
  gst_rate_percent?: number;

  @IsOptional()
  @IsNumber()
  seller_agent_rate?: number;

  @IsOptional()
  @IsNumber()
  buyer_agent_rate?: number;

  @IsOptional()
  @IsEnum(EarningAppliesRole)
  applies_to_role?: EarningAppliesRole;

  @IsOptional()
  @IsNumber()
  applies_to_user_id?: number | null;

  @IsOptional()
  @IsNumber()
  min_amount?: number;

  @IsOptional()
  @IsNumber()
  max_cap?: number | null;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEarningTierDto)
  tiers?: CreateEarningTierDto[];
}
