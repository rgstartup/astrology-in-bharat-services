import { IsEnum, IsString, IsOptional } from 'class-validator';
import { DisputeStatus, DisputePriority } from '../../domain/entities/dispute.entity';

export class UpdateDisputeStatusDto {
    @IsOptional()
    @IsEnum(DisputeStatus)
    status?: DisputeStatus;

    @IsOptional()
    @IsEnum(DisputePriority)
    priority?: DisputePriority;

    @IsOptional()
    @IsString()
    adminNotes?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
