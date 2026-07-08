import { IsString, IsEnum, IsOptional } from 'class-validator';
import { CallType } from '../../infrastructure/entities/call-session.entity';

export class InitiateCallDto {
  @IsString()
  expert_id: string;

  @IsOptional()
  @IsEnum(CallType)
  type?: CallType;
}
