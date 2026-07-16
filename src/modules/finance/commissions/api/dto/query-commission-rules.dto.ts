import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  CommissionEventType,
  CommissionType,
} from '@/modules/finance/commissions/infrastructure/entities/commission-rule.entity';

export class QueryCommissionRulesDto {
  @IsOptional()
  @IsEnum(CommissionEventType)
  event_type?: CommissionEventType;

  @IsOptional()
  @IsEnum(CommissionType)
  commission_type?: CommissionType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  is_active?: boolean;
}
