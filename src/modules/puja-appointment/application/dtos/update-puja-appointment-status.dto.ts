import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PujaAppointmentStatus } from "../../infrastructure/persistence/entities/puja-appointment.entity";

export class UpdatePujaAppointmentStatusDto {
  @IsOptional()
  @IsEnum(PujaAppointmentStatus)
  status?: PujaAppointmentStatus;

  @IsOptional()
  @IsString()
  expert_message?: string;

  @IsOptional()
  @IsString()
  scheduled_date?: string;

  @IsOptional()
  @IsString()
  scheduled_time?: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}
