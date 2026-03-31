import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PujaMode } from "../../infrastructure/persistence/entities/puja-appointment.entity";

export class CreatePujaAppointmentDto {
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
}
