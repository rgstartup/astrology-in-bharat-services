import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PujaMode } from '../../infrastructure/entities/puja-appointment.entity';

export class CreatePujaAppointmentDto {
  @IsUUID()
  puja_id: string;

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
}
