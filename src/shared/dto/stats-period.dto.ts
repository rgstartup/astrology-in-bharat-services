import { IsEnum, IsOptional } from 'class-validator';

export enum StatsPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class StatsPeriodDto {
  @IsOptional()
  @IsEnum(StatsPeriod)
  period?: StatsPeriod = StatsPeriod.MONTHLY;
}