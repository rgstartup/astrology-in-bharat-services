import { DisputeStatus } from '../../support/entities/dispute.entity';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateDisputeStatusDto {
  @IsNotEmpty()
  @IsEnum(DisputeStatus)
  status!: DisputeStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
