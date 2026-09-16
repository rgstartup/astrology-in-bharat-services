import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PujaMode } from '../entities/puja-appointment.entity';
import { AddressDto } from '@/common/address/address.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class CreatePujaAppointmentDto {
  @Type(() => Number)
  @IsNumber()
  puja_id: number;

  @IsOptional()
  @IsString()
  scheduled_date?: string | null;

  @IsOptional()
  @IsString()
  scheduled_time?: string | null;

  @IsBoolean()
  ask_expert_for_date: boolean;

  @IsEnum(PujaMode)
  mode: PujaMode;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  user_message?: string;

  @IsOptional()
  @Type(() => AddressDto)
  @ValidateNested()
  address?: AddressDto;
}
