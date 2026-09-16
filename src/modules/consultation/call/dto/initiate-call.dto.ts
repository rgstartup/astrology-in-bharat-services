import { IsInt, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CallType } from '../entities/call-session.entity';

export class InitiateCallDto {
  @IsInt()
  @Type(() => Number)
  expert_id!: number;

  @IsOptional()
  @IsEnum(CallType)
  type?: CallType;
}
